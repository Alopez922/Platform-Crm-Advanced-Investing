import { prisma } from '../../lib/prisma';

// ── Calcular fechas de cada paso ──────────────────────────────
// Toma la fecha base y agrega el delay en minutos.
// Si el paso tiene sendAtTime (ej: "15:00"), ajusta a esa hora del día.
function calculateScheduledAt(base: Date, delayMinutes: number, sendAtTime?: string | null): Date {
  const scheduled = new Date(base.getTime() + delayMinutes * 60 * 1000);

  if (sendAtTime) {
    // Respetar la hora específica del mismo día que resultó del delay
    const [hours, minutes] = sendAtTime.split(':').map(Number);
    scheduled.setHours(hours, minutes, 0, 0);

    // Si ya pasó esa hora hoy, mover al día siguiente
    if (scheduled <= base) {
      scheduled.setDate(scheduled.getDate() + 1);
      scheduled.setHours(hours, minutes, 0, 0);
    }
  }

  return scheduled;
}

export const sequenceService = {

  // ── CRUD de Secuencias ───────────────────────────────────
  async getAll(companyId: string) {
    return prisma.sequence.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        steps: { orderBy: { position: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
  },

  async getById(id: string) {
    return prisma.sequence.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { position: 'asc' } },
      },
    });
  },

  async create(companyId: string, data: {
    name: string;
    description?: string;
    isAutoAssign?: boolean;
    steps: Array<{
      position: number;
      delayMinutes: number;
      sendAtTime?: string;
      subject: string;
      bodyHtml: string;
    }>;
  }) {
    return prisma.sequence.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        isAutoAssign: data.isAutoAssign ?? false,
        steps: {
          create: data.steps.map((step) => ({
            position: step.position,
            delayMinutes: step.delayMinutes,
            sendAtTime: step.sendAtTime || null,
            subject: step.subject,
            bodyHtml: step.bodyHtml,
          })),
        },
      },
      include: { steps: { orderBy: { position: 'asc' } } },
    });
  },

  async update(id: string, data: {
    name?: string;
    description?: string;
    isActive?: boolean;
    isAutoAssign?: boolean;
    steps?: Array<{
      position: number;
      delayMinutes: number;
      sendAtTime?: string;
      subject: string;
      bodyHtml: string;
    }>;
  }) {
    // Si se actualizan los pasos, borrar los viejos y recrear
    if (data.steps) {
      await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } });
    }

    return prisma.sequence.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isAutoAssign !== undefined && { isAutoAssign: data.isAutoAssign }),
        ...(data.steps && {
          steps: {
            create: data.steps.map((step) => ({
              position: step.position,
              delayMinutes: step.delayMinutes,
              sendAtTime: step.sendAtTime || null,
              subject: step.subject,
              bodyHtml: step.bodyHtml,
            })),
          },
        }),
      },
      include: { steps: { orderBy: { position: 'asc' } } },
    });
  },

  async delete(id: string) {
    return prisma.sequence.delete({ where: { id } });
  },

  // ── Enrollar un lead en una secuencia ────────────────────
  async enrollLead(leadId: string, sequenceId: string) {
    // Verificar si ya está inscrito
    const existing = await prisma.sequenceEnrollment.findUnique({
      where: { leadId_sequenceId: { leadId, sequenceId } },
    });
    if (existing && existing.status === 'ACTIVE') {
      throw new Error('El lead ya está inscrito en esta secuencia');
    }

    // Obtener los pasos de la secuencia
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId },
      include: { steps: { orderBy: { position: 'asc' } } },
    });
    if (!sequence) throw new Error('Secuencia no encontrada');
    if (sequence.steps.length === 0) throw new Error('La secuencia no tiene pasos configurados');

    let enrollment;

    if (existing) {
      // Re-inscripción: limpiar ejecuciones viejas y resetear
      await prisma.stepExecution.deleteMany({ where: { enrollmentId: existing.id } });
      enrollment = await prisma.sequenceEnrollment.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', cancelledAt: null, completedAt: null, currentStepPos: 0 },
      });
    } else {
      // Nueva inscripción
      enrollment = await prisma.sequenceEnrollment.create({
        data: { leadId, sequenceId, status: 'ACTIVE' },
      });
    }

    // Programar ejecuciones para cada paso
    const now = new Date();
    let baseTime = now;

    for (const step of sequence.steps) {
      const scheduledAt = calculateScheduledAt(baseTime, step.delayMinutes, step.sendAtTime);

      await prisma.stepExecution.create({
        data: {
          enrollmentId: enrollment.id,
          stepId: step.id,
          scheduledAt,
          status: 'SCHEDULED',
        },
      });

      console.log(`[Enrollment] 📧 Paso ${step.position} programado para: ${scheduledAt.toISOString()} (delay: ${step.delayMinutes}min)`);

      // El próximo paso parte desde la fecha de este
      baseTime = scheduledAt;
    }

    // Log de actividad
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'SEQUENCE_ENROLLED',
        metadata: { sequenceId, sequenceName: sequence.name },
      },
    });

    return enrollment;
  },

  // ── Pausar inscripción ───────────────────────────────────
  async pauseEnrollment(enrollmentId: string) {
    return prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });
  },

  // ── Reanudar inscripción ─────────────────────────────────
  async resumeEnrollment(enrollmentId: string) {
    return prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'ACTIVE', pausedAt: null },
    });
  },

  // ── Cancelar inscripción ─────────────────────────────────
  async cancelEnrollment(enrollmentId: string) {
    const enrollment = await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: { lead: { select: { id: true } } },
    });

    // Cancelar ejecuciones pendientes
    await prisma.stepExecution.updateMany({
      where: { enrollmentId, status: 'SCHEDULED' },
      data: { status: 'SKIPPED' },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: enrollment.lead.id,
        type: 'SEQUENCE_CANCELLED',
        metadata: { enrollmentId },
      },
    });

    return enrollment;
  },

  // ── Obtener inscripciones de un lead con progreso ────────
  async getEnrollmentsByLead(leadId: string) {
    return prisma.sequenceEnrollment.findMany({
      where: { leadId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        sequence: { select: { id: true, name: true, description: true } },
        executions: {
          orderBy: { scheduledAt: 'asc' },
          include: {
            step: {
              select: { position: true, subject: true, delayMinutes: true, sendAtTime: true },
            },
          },
        },
      },
    });
  },
};
