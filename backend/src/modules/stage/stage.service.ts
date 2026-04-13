import { prisma } from '../../lib/prisma';

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();
}

export const stageService = {
  // Listar etapas de una empresa (ordenadas por posición)
  async getAllByCompany(companyId: string) {
    return prisma.leadStage.findMany({
      where: { companyId },
      orderBy: { position: 'asc' },
      include: { _count: { select: { leads: true } } },
    });
  },

  // Crear nueva etapa
  async create(companyId: string, data: { name: string; color?: string; position?: number; isFinal?: boolean }) {
    // Si no viene posición, ponerla al final
    if (data.position === undefined) {
      const lastStage = await prisma.leadStage.findFirst({
        where: { companyId },
        orderBy: { position: 'desc' },
      });
      data.position = (lastStage?.position ?? -1) + 1;
    }

    return prisma.leadStage.create({
      data: {
        companyId,
        name: data.name,
        slug: generateSlug(data.name),
        color: data.color || '#6B7280',
        position: data.position,
        isFinal: data.isFinal || false,
      },
    });
  },

  // Actualizar etapa
  async update(id: string, data: { name?: string; color?: string; position?: number; isFinal?: boolean }) {
    const updateData: any = { ...data };
    if (data.name) updateData.slug = generateSlug(data.name);
    return prisma.leadStage.update({ where: { id }, data: updateData });
  },

  // Reordenar etapas
  async reorder(stages: { id: string; position: number }[]) {
    const updates = stages.map((s) =>
      prisma.leadStage.update({ where: { id: s.id }, data: { position: s.position } })
    );
    return prisma.$transaction(updates);
  },

  // Eliminar etapa (solo si no tiene leads)
  async delete(id: string) {
    const count = await prisma.lead.count({ where: { stageId: id } });
    if (count > 0) {
      throw Object.assign(new Error('No se puede eliminar una etapa que tiene leads. Mueve los leads primero.'), { statusCode: 400 });
    }
    return prisma.leadStage.delete({ where: { id } });
  },
};
