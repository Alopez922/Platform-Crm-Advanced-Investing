import { Router, Request, Response } from 'express';
import { followUpService } from './followup.service';
import { sendSuccess, asyncHandler } from '../../utils/apiResponse';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const createFollowUpSchema = z.object({
  assignedToId: z.string().uuid().optional(),
  dueAt: z.string(),
  note: z.string().optional(),
});

// GET /api/companies/:companyId/followups
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const followUps = await followUpService.getByCompany(req.params.companyId, req.query.status as string);
  sendSuccess(res, followUps);
}));

// GET /api/companies/:companyId/leads/:leadId/followups
router.get('/lead/:leadId', asyncHandler(async (req: Request, res: Response) => {
  const followUps = await followUpService.getByLead(req.params.leadId);
  sendSuccess(res, followUps);
}));

// POST /api/companies/:companyId/leads/:leadId/followups
router.post('/lead/:leadId', validate({ body: createFollowUpSchema }), asyncHandler(async (req: Request, res: Response) => {
  const followUp = await followUpService.create(req.params.leadId, req.body);
  sendSuccess(res, followUp, 201);
}));

// PATCH /api/followups/:followUpId/complete
router.patch('/:followUpId/complete', asyncHandler(async (req: Request, res: Response) => {
  const followUp = await followUpService.complete(req.params.followUpId);
  sendSuccess(res, followUp);
}));

// PATCH /api/followups/:followUpId/skip
router.patch('/:followUpId/skip', asyncHandler(async (req: Request, res: Response) => {
  const followUp = await followUpService.skip(req.params.followUpId);
  sendSuccess(res, followUp);
}));

export default router;
