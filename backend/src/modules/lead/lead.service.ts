import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export const leadService = {
  // ── BOARD QUERY: Obtener el tablero Kanban completo ──────
  // Retorna todas las etapas con sus leads para una empresa
  async getBoard(companyId: string, filters?: {
    source?: string;
    search?: string;
    stageId?: string;
  }) {
    // Construir filtro de leads
    const leadWhere: Prisma.LeadWhereInput = {
      companyId,
      isArchived: false,
    };

    if (filters?.source) {
      leadWhere.source = filters.source;
    }

    if (filters?.search) {
      leadWhere.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Obtener las etapas con sus leads filtrados
    const stages = await prisma.leadStage.findMany({
      where: { companyId },
      orderBy: { position: 'asc' },
      include: {
        leads: {
          where: leadWhere,
          orderBy: { position: 'asc' },
          include: {
            assignments: {
              where: { isActive: true },
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
        _count: { select: { leads: true } },
      },
    });

    return stages;
  },

  // ── Listar leads de una empresa (paginado) ────────────────
  async getAll(companyId: string, options: {
    source?: string;
    stageId?: string;
    search?: string;
    isArchived?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = { companyId };

    if (options.source) where.source = options.source;
    if (options.stageId) where.stageId = options.stageId;
    if (options.isArchived !== undefined) where.isArchived = options.isArchived;

    if (options.search) {
      where.OR = [
        { fullName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          stage: { select: { id: true, name: true, color: true } },
          assignments: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // ── Obtener un lead con todos sus detalles ────────────────
  async getById(leadId: string) {
    return prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        stage: true,
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        },
        followUps: {
          orderBy: { dueAt: 'asc' },
          include: { assignedTo: { select: { id: true, name: true } } },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, name: true } } },
        },
        syncMap: true,
      },
    });
  },

  // ── Crear lead ────────────────────────────────────────────
  async create(companyId: string, data: {
    fullName: string;
    email?: string;
    phone?: string;
    source?: string;
    stageId?: string;
    tags?: string[];
    customFields?: any;
    nextFollowUpAt?: string;
  }) {
    // Si no viene stageId, usar la primera etapa de la empresa
    let stageId = data.stageId;
    if (!stageId) {
      const firstStage = await prisma.leadStage.findFirst({
        where: { companyId },
        orderBy: { position: 'asc' },
      });
      if (!firstStage) throw Object.assign(new Error('La empresa no tiene etapas configuradas'), { statusCode: 400 });
      stageId = firstStage.id;
    }

    // Calcular posición (al final de las cards en esa columna)
    const lastLead = await prisma.lead.findFirst({
      where: { companyId, stageId },
      orderBy: { position: 'desc' },
    });
    const position = (lastLead?.position ?? -1) + 1;

    const lead = await prisma.lead.create({
      data: {
        companyId,
        stageId,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        source: data.source || null,
        tags: data.tags || [],
        customFields: data.customFields || null,
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
        position,
      },
      include: {
        stage: { select: { id: true, name: true, color: true } },
      },
    });

    // Registrar actividad
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'CREATED',
        metadata: { source: data.source || 'manual' },
      },
    });

    return lead;
  },

  // ── Actualizar lead ───────────────────────────────────────
  async update(leadId: string, data: any) {
    return prisma.lead.update({
      where: { id: leadId },
      data: {
        ...data,
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
      },
      include: {
        stage: { select: { id: true, name: true, color: true } },
      },
    });
  },

  // ── Mover lead a otra etapa (drag & drop del Kanban) ─────
  async moveToStage(leadId: string, stageId: string, position?: number) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { stage: true },
    });

    if (!lead) throw Object.assign(new Error('Lead no encontrado'), { statusCode: 404 });

    const oldStageName = lead.stage.name;

    // Calcular posición si no se proporcionó
    if (position === undefined) {
      const lastLead = await prisma.lead.findFirst({
        where: { stageId },
        orderBy: { position: 'desc' },
      });
      position = (lastLead?.position ?? -1) + 1;
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { stageId, position },
      include: {
        stage: { select: { id: true, name: true, color: true } },
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    // Registrar actividad de cambio de etapa
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'STAGE_CHANGED',
        metadata: {
          from: oldStageName,
          to: updatedLead.stage.name,
        },
      },
    });

    return updatedLead;
  },

  // ── Archivar lead ─────────────────────────────────────────
  async archive(leadId: string) {
    return prisma.lead.update({
      where: { id: leadId },
      data: { isArchived: true },
    });
  },

  // ── Obtener fuentes únicas de leads para filtros ──────────
  async getSources(companyId: string) {
    const leads = await prisma.lead.findMany({
      where: { companyId, source: { not: null } },
      select: { source: true },
      distinct: ['source'],
    });
    return leads.map((l) => l.source).filter(Boolean);
  },

  // ── Eliminar permanentemente todos los archivados ─────────
  // Antes de borrar, guarda email/teléfono en la lista de exclusión
  // para que el sync nunca los vuelva a importar.
  async deleteAllArchived(companyId: string) {
    // 1. Obtener datos de los leads antes de borrarlos
    const archivedLeads = await prisma.lead.findMany({
      where: { companyId, isArchived: true },
      select: { email: true, phone: true, fullName: true },
    });

    // 2. Guardar en lista de exclusión (solo los que tienen email o teléfono)
    const excludeEntries = archivedLeads
      .filter((l) => l.email || l.phone)
      .map((l) => ({
        companyId,
        email: l.email || null,
        phone: l.phone || null,
        fullName: l.fullName,
        reason: 'PERMANENTLY_DELETED',
      }));

    if (excludeEntries.length > 0) {
      await (prisma as any).syncExcludeList.createMany({
        data: excludeEntries,
        skipDuplicates: true,
      });
    }

    // 3. Eliminar permanentemente
    const result = await prisma.lead.deleteMany({
      where: { companyId, isArchived: true },
    });

    return result.count;
  },

  // ── Eliminar un lead archivado permanentemente ────────────
  async deletePermanently(leadId: string, companyId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { email: true, phone: true, fullName: true },
    });

    if (lead && (lead.email || lead.phone)) {
      await (prisma as any).syncExcludeList.create({
        data: {
          companyId,
          email: lead.email || null,
          phone: lead.phone || null,
          fullName: lead.fullName,
          reason: 'PERMANENTLY_DELETED',
        },
      });
    }

    return prisma.lead.delete({ where: { id: leadId } });
  },
};
