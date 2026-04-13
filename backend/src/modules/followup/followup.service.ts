import { prisma } from '../../lib/prisma';

export const followUpService = {
  async getByCompany(companyId: string, status?: string) {
    const where: any = { lead: { companyId } };
    if (status) where.status = status;

    return prisma.followUp.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: {
        lead: { select: { id: true, fullName: true, companyId: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  },

  async getByLead(leadId: string) {
    return prisma.followUp.findMany({
      where: { leadId },
      orderBy: { dueAt: 'asc' },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
  },

  async create(leadId: string, data: { assignedToId?: string; dueAt: string; note?: string }) {
    // Si no se pasa assignedToId, usar el primer usuario del sistema
    let userId = data.assignedToId;
    if (!userId) {
      let firstUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!firstUser) {
        // Auto-crear un usuario de sistema por defecto
        firstUser = await prisma.user.create({
          data: {
            email: 'admin@leadpilot.com',
            name: 'Admin',
            role: 'ADMIN',
          },
        });
      }
      userId = firstUser.id;
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        assignedToId: userId,
        dueAt: new Date(data.dueAt),
        note: data.note,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    // Actualizar nextFollowUpAt del lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUpAt: new Date(data.dueAt) },
    });

    await prisma.leadActivity.create({
      data: { leadId, userId, type: 'FOLLOWUP_CREATED', metadata: { followUpId: followUp.id, dueAt: data.dueAt } },
    });

    return followUp;
  },

  async complete(id: string) {
    return prisma.followUp.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  },

  async skip(id: string) {
    return prisma.followUp.update({
      where: { id },
      data: { status: 'SKIPPED' },
    });
  },
};
