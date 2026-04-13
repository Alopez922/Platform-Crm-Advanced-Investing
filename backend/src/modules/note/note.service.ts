import { prisma } from '../../lib/prisma';

export const noteService = {
  async getByLead(leadId: string) {
    return prisma.leadNote.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },

  async create(leadId: string, authorId: string | null, content: string) {
    const note = await prisma.leadNote.create({
      data: {
        leadId,
        content,
        ...(authorId && authorId !== 'system' ? { authorId } : {}),
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'NOTE_ADDED',
        metadata: { noteId: note.id },
        ...(authorId && authorId !== 'system' ? { userId: authorId } : {}),
      },
    });

    return note;
  },

  async update(id: string, content: string) {
    return prisma.leadNote.update({ where: { id }, data: { content } });
  },

  async delete(id: string) {
    return prisma.leadNote.delete({ where: { id } });
  },
};
