import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess, asyncHandler } from '../../utils/apiResponse';

const router = Router();

// GET /api/notifications — Obtener notificaciones no leídas
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const notifications = await (prisma as any).notification.findMany({
    where: { isRead: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      company: { select: { name: true, color: true, slug: true } },
    },
  });
  const unreadCount = await (prisma as any).notification.count({ where: { isRead: false } });
  sendSuccess(res, { notifications, unreadCount });
}));

// PATCH /api/notifications/read-all — Marcar todas como leídas
router.patch('/read-all', asyncHandler(async (_req: Request, res: Response) => {
  await (prisma as any).notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
  sendSuccess(res, { message: 'Todas marcadas como leídas' });
}));

// PATCH /api/notifications/:id/read — Marcar una como leída
router.patch('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  await (prisma as any).notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  sendSuccess(res, { message: 'Notificación leída' });
}));

// DELETE /api/notifications — Borrar todas las notificaciones leídas
router.delete('/', asyncHandler(async (_req: Request, res: Response) => {
  await (prisma as any).notification.deleteMany({ where: { isRead: true } });
  sendSuccess(res, { message: 'Notificaciones borradas' });
}));

export default router;
