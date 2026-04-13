import { Router, Request, Response } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess, asyncHandler } from '../../utils/apiResponse';

const router = Router();

// GET /api/dashboard/my-day — Resumen diario para el usuario
router.get(
  '/my-day',
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await dashboardService.getMyDay();
    sendSuccess(res, data);
  })
);

// POST /api/dashboard/mark-contacted/:leadId — Mover lead a etapa "Contactado"
router.post(
  '/mark-contacted/:leadId',
  asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const result = await dashboardService.markAsContacted(req.params.leadId as string);
    sendSuccess(res, result);
  })
);

export default router;
