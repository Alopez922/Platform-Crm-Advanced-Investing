import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/emailService';

/**
 * Scheduler de Secuencias de Seguimiento
 *
 * Cada minuto revisa StepExecution pendientes cuya scheduledAt <= ahora.
 * Si la inscripción está ACTIVA, envía el email y actualiza el estado.
 * Al completar el último paso, marca la inscripción como COMPLETED.
 */
export function startSequenceScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Buscar ejecuciones pendientes vencidas
      const pendingExecutions = await prisma.stepExecution.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: now },
          enrollment: { status: 'ACTIVE' }, // Solo si la secuencia está activa
        },
        include: {
          step: true,
          enrollment: {
            include: {
              lead: { select: { id: true, fullName: true, email: true, phone: true, source: true } },
              sequence: { select: { id: true, name: true, companyId: true } },
            },
          },
        },
        take: 50, // Procesar máximo 50 por ciclo para no saturar
      });

      for (const execution of pendingExecutions) {
        const { enrollment, step } = execution;
        const { lead } = enrollment;

        // Intentar reclamar esta ejecución de forma atómica
        // Si otro proceso ya la tomó, updateMany devuelve count=0
        const claimed = await prisma.stepExecution.updateMany({
          where: { id: execution.id, status: 'SCHEDULED' },
          data: { status: 'EXECUTING' },
        });

        // Si count=0, otro proceso ya la tomó — saltar
        if (claimed.count === 0) continue;

        try {
          // Si el lead no tiene email, saltar este paso
          if (!lead.email) {
            await prisma.stepExecution.update({
              where: { id: execution.id },
              data: { status: 'SKIPPED', executedAt: now, errorMessage: 'Lead sin email' },
            });
            console.log(`[Scheduler] ⚠️  Lead ${lead.fullName} sin email — paso omitido`);
          } else {
            // Variables para interpolación en el email
            const variables = {
              nombre: lead.fullName,
              email: lead.email || '',
              telefono: lead.phone || '',
              empresa: '', // se puede extender
              fuente: lead.source || '',
            };

            // Enviar el email
            const result = await sendEmail({
              to: lead.email,
              subject: step.subject,
              bodyHtml: step.bodyHtml,
              variables,
            });

            // Marcar como enviado
            await prisma.stepExecution.update({
              where: { id: execution.id },
              data: {
                status: 'SENT',
                executedAt: now,
                emailMessageId: result.messageId,
              },
            });

            // Registrar actividad en el lead
            await prisma.leadActivity.create({
              data: {
                leadId: lead.id,
                type: 'SEQUENCE_EMAIL_SENT',
                metadata: {
                  sequenceName: enrollment.sequence.name,
                  stepPosition: step.position,
                  subject: step.subject,
                  to: lead.email,
                },
              },
            });

            console.log(`[Scheduler] ✅ Email enviado — Lead: ${lead.fullName} | Paso: ${step.position} | Asunto: ${step.subject}`);
          }

          // Actualizar posición actual en el enrollment
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { currentStepPos: step.position },
          });

          // Verificar si era el último paso → marcar secuencia completa
          const totalSteps = await prisma.sequenceStep.count({
            where: { sequenceId: enrollment.sequenceId },
          });

          const pendingSteps = await prisma.stepExecution.count({
            where: {
              enrollmentId: enrollment.id,
              status: 'SCHEDULED',
            },
          });

          if (pendingSteps === 0) {
            await prisma.sequenceEnrollment.update({
              where: { id: enrollment.id },
              data: { status: 'COMPLETED', completedAt: now },
            });

            await prisma.leadActivity.create({
              data: {
                leadId: lead.id,
                type: 'SEQUENCE_COMPLETED',
                metadata: {
                  sequenceName: enrollment.sequence.name,
                  totalSteps,
                },
              },
            });

            // Notificación interna al completar la secuencia
            await (prisma as any).notification.create({
              data: {
                companyId: enrollment.sequence.companyId,
                type: 'SEQUENCE_COMPLETED',
                title: `✅ Secuencia completada: ${enrollment.sequence.name}`,
                body: `El lead ${lead.fullName} completó todos los ${totalSteps} pasos.`,
                count: 1,
              },
            });

            console.log(`[Scheduler] 🎉 Secuencia completa — Lead: ${lead.fullName} | Secuencia: ${enrollment.sequence.name}`);
          }

        } catch (error: any) {
          // Marcar como fallido pero no detener el resto
          await prisma.stepExecution.update({
            where: { id: execution.id },
            data: { status: 'FAILED', executedAt: now, errorMessage: error.message },
          });
          console.error(`[Scheduler] ❌ Error al enviar — Lead: ${lead.fullName}:`, error.message);
        }
      }

    } catch (err: any) {
      console.error('[Scheduler] Error general:', err.message);
    }
  });

  console.log('✅ Scheduler de secuencias iniciado (revisión cada minuto)');
}
