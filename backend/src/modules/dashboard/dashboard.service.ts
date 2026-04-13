import { prisma } from '../../lib/prisma';

export const dashboardService = {

  /**
   * Marcar un lead como "Contactado" — Busca la etapa con role CONTACTED
   * y mueve el lead ahí. Usado desde el Dashboard para quitar de "Sin contactar".
   */
  async markAsContacted(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { stage: true },
    });

    if (!lead) throw new Error('Lead no encontrado');

    // Buscar la etapa con role CONTACTED para esta empresa
    const contactedStage = await prisma.leadStage.findFirst({
      where: { companyId: lead.companyId, role: 'CONTACTED' },
    });

    if (!contactedStage) throw new Error('No se encontró una etapa con rol "Contactado"');

    // Si ya está en esa etapa o más adelante, no hacer nada
    if (lead.stage && lead.stage.position >= contactedStage.position) {
      return { alreadyContacted: true, lead };
    }

    // Mover el lead a la etapa "Contactado"
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { stageId: contactedStage.id },
    });

    // Registrar actividad
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'STAGE_CHANGED',
        metadata: {
          from: lead.stage?.name,
          to: contactedStage.name,
          source: 'dashboard',
        },
      },
    });

    return { alreadyContacted: false, lead: updatedLead };
  },

  /**
   * "Mi Día" — Resumen diario para la persona que usa la plataforma
   * Retorna follow-ups pendientes, leads sin contactar, leads estancados y stats.
   */
  async getMyDay() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Inicio de la semana (lunes)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes como inicio
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // ── 1. Follow-ups de hoy + vencidos (no completados) ─────
    const todayFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        dueAt: { lte: todayEnd },
      },
      orderBy: { dueAt: 'asc' },
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            companyId: true,
            tags: true,
            stage: { select: { name: true, color: true } },
            company: { select: { name: true, slug: true, color: true } },
          },
        },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Marcar cuáles están vencidos (antes de hoy)
    const followUpsWithStatus = todayFollowUps.map((fu) => ({
      ...fu,
      isOverdue: new Date(fu.dueAt) < todayStart,
    }));

    // ── 2. Leads sin contactar (en etapa con role ENTRY) ─
    const uncontactedLeads = await prisma.lead.findMany({
      where: {
        isArchived: false,
        stage: { role: 'ENTRY' }, // Solo leads en etapas con rol de entrada
        notes: { none: {} },
        activities: {
          none: {
            type: {
              in: ['NOTE_ADDED', 'FOLLOWUP_COMPLETED', 'SEQUENCE_EMAIL_SENT', 'STAGE_CHANGED'],
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        stage: { select: { name: true, color: true, role: true } },
        company: { select: { name: true, slug: true, color: true } },
      },
    });

    // ── 3. Leads estancados (+3 días sin actividad) ─────────
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const staleLeads = await prisma.lead.findMany({
      where: {
        isArchived: false,
        updatedAt: { lt: threeDaysAgo },
        // Que no sea un lead recién creado
        createdAt: { lt: threeDaysAgo },
      },
      orderBy: { updatedAt: 'asc' },
      take: 15,
      include: {
        stage: { select: { name: true, color: true } },
        company: { select: { name: true, slug: true, color: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, type: true },
        },
      },
    });

    // ── 4. Stats ────────────────────────────────────────────
    const [newLeadsToday, newLeadsThisWeek, pendingFollowUps, completedThisWeek] =
      await Promise.all([
        prisma.lead.count({
          where: {
            isArchived: false,
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.lead.count({
          where: {
            isArchived: false,
            createdAt: { gte: weekStart },
          },
        }),
        prisma.followUp.count({
          where: { status: 'PENDING' },
        }),
        prisma.followUp.count({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: weekStart },
          },
        }),
      ]);

    return {
      todayFollowUps: followUpsWithStatus,
      uncontactedLeads,
      staleLeads,
      stats: {
        newLeadsToday,
        newLeadsThisWeek,
        pendingFollowUps,
        completedThisWeek,
      },
    };
  },
};
