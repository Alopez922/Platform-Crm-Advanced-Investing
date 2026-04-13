import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess, asyncHandler } from '../../utils/apiResponse';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const webhookConfigSchema = z.object({
  webhookUrl: z.string().url('URL de webhook inválida'),
  secretKey: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/companies/:companyId/automations/config — Config de webhook
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  const config = await prisma.webhookConfig.findUnique({
    where: { companyId: req.params.companyId },
  });
  sendSuccess(res, config);
}));

// POST /api/companies/:companyId/automations/config — Guardar config de webhook
router.post('/config', validate({ body: webhookConfigSchema }), asyncHandler(async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const config = await prisma.webhookConfig.upsert({
    where: { companyId },
    update: req.body,
    create: { companyId, ...req.body },
  });
  sendSuccess(res, config, 201);
}));

// GET /api/companies/:companyId/automations/events — Log de eventos
router.get('/events', asyncHandler(async (req: Request, res: Response) => {
  const events = await prisma.automationEvent.findMany({
    where: { companyId: req.params.companyId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  sendSuccess(res, events);
}));

// GET /api/companies/:companyId/automations/deliveries — Log de envíos
router.get('/deliveries', asyncHandler(async (req: Request, res: Response) => {
  const deliveries = await prisma.automationDelivery.findMany({
    where: { event: { companyId: req.params.companyId } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { event: { select: { eventType: true, createdAt: true } } },
  });
  sendSuccess(res, deliveries);
}));

export default router;
