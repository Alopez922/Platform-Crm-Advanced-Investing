import { prisma } from '../../lib/prisma';

// Genera un slug a partir del nombre de la empresa
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Etapas por defecto al crear una empresa nueva
const DEFAULT_STAGES = [
  { name: 'Nuevo', slug: 'nuevo', color: '#3B82F6', position: 0, role: 'ENTRY' as const },
  { name: 'Contactado', slug: 'contactado', color: '#F59E0B', position: 1, role: 'CONTACTED' as const },
  { name: 'Calificado', slug: 'calificado', color: '#8B5CF6', position: 2, role: 'FOLLOW_UP' as const },
  { name: 'Propuesta', slug: 'propuesta', color: '#EC4899', position: 3, role: 'FOLLOW_UP' as const },
  { name: 'Ganado', slug: 'ganado', color: '#10B981', position: 4, isFinal: true, role: 'WON' as const },
  { name: 'Perdido', slug: 'perdido', color: '#EF4444', position: 5, isFinal: true, role: 'LOST' as const },
];

export const companyService = {
  // Listar todas las empresas activas
  async getAll() {
    return prisma.company.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { leads: true } },
        sheetConnection: { select: { lastSyncAt: true, syncStatus: true } },
      },
    });
  },

  // Obtener una empresa por ID
  async getById(id: string) {
    return prisma.company.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { position: 'asc' } },
        sheetConnection: true,
        _count: { select: { leads: true } },
      },
    });
  },

  // Obtener empresa por slug
  async getBySlug(slug: string) {
    return prisma.company.findUnique({
      where: { slug },
      include: {
        stages: { orderBy: { position: 'asc' } },
        sheetConnection: true,
        _count: { select: { leads: true } },
      },
    });
  },

  // Crear una empresa nueva con etapas por defecto
  async create(data: { name: string; description?: string; color?: string; logoUrl?: string }) {
    const slug = generateSlug(data.name);

    return prisma.company.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        color: data.color || '#2596DC',
        logoUrl: data.logoUrl,
        stages: {
          create: DEFAULT_STAGES,
        },
      },
      include: {
        stages: { orderBy: { position: 'asc' } },
      },
    });
  },

  // Actualizar empresa
  async update(id: string, data: { name?: string; description?: string; color?: string; logoUrl?: string }) {
    const updateData: any = { ...data };
    if (data.name) {
      updateData.slug = generateSlug(data.name);
    }

    return prisma.company.update({
      where: { id },
      data: updateData,
    });
  },

  // Eliminar empresa PERMANENTEMENTE de la BD
  async delete(id: string) {
    return prisma.company.delete({ where: { id } });
  },

  // ── GESTIÓN DE ETAPAS ─────────────────────────────────

  // Listar etapas de una empresa con conteo de leads
  async getStages(companyId: string) {
    return prisma.leadStage.findMany({
      where: { companyId },
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { leads: true } },
      },
    });
  },

  // Actualizar todas las etapas de una empresa (batch update)
  async updateStages(companyId: string, stages: { id: string; name: string; color: string; role: string; position: number }[]) {
    const updates = stages.map((stage) =>
      prisma.leadStage.update({
        where: { id: stage.id },
        data: {
          name: stage.name,
          slug: generateSlug(stage.name),
          color: stage.color,
          role: stage.role as any,
          position: stage.position,
          isFinal: stage.role === 'WON' || stage.role === 'LOST',
        },
      })
    );

    await prisma.$transaction(updates);

    return prisma.leadStage.findMany({
      where: { companyId },
      orderBy: { position: 'asc' },
      include: { _count: { select: { leads: true } } },
    });
  },

  // Agregar una nueva etapa
  async addStage(companyId: string, data: { name: string; color: string; role: string }) {
    const lastStage = await prisma.leadStage.findFirst({
      where: { companyId },
      orderBy: { position: 'desc' },
    });
    const position = (lastStage?.position ?? -1) + 1;

    return prisma.leadStage.create({
      data: {
        companyId,
        name: data.name,
        slug: generateSlug(data.name) + '-' + position,
        color: data.color,
        role: data.role as any,
        position,
        isFinal: data.role === 'WON' || data.role === 'LOST',
      },
      include: { _count: { select: { leads: true } } },
    });
  },

  // Eliminar una etapa (solo si no tiene leads)
  async deleteStage(companyId: string, stageId: string) {
    const stage = await prisma.leadStage.findUnique({
      where: { id: stageId },
      include: { _count: { select: { leads: true } } },
    });

    if (!stage) throw new Error('Etapa no encontrada');
    if (stage.companyId !== companyId) throw new Error('Etapa no pertenece a esta empresa');
    if (stage._count.leads > 0) throw new Error(`No puedes eliminar esta etapa porque tiene ${stage._count.leads} leads. Mueve los leads primero.`);

    await prisma.leadStage.delete({ where: { id: stageId } });

    // Reordenar posiciones
    const remaining = await prisma.leadStage.findMany({
      where: { companyId },
      orderBy: { position: 'asc' },
    });

    const reorder = remaining.map((s, i) =>
      prisma.leadStage.update({ where: { id: s.id }, data: { position: i } })
    );

    await prisma.$transaction(reorder);

    return { deleted: true };
  },
};
