import { Router, Request, Response } from 'express';
import { sequenceService } from './sequence.service';
import { sendSuccess, asyncHandler } from '../../utils/apiResponse';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router({ mergeParams: true });

// ── Schemas de validación ─────────────────────────────────────
const stepSchema = z.object({
  position: z.number().int().min(1),
  delayMinutes: z.number().int().min(0).default(0),
  sendAtTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
});

const createSequenceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isAutoAssign: z.boolean().optional(),
  steps: z.array(stepSchema).min(1),
});

const updateSequenceSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  isAutoAssign: z.boolean().optional(),
  steps: z.array(stepSchema).optional(),
});

// ── GET /api/companies/:companyId/sequences ───────────────────
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const sequences = await sequenceService.getAll(req.params.companyId);
  sendSuccess(res, sequences);
}));

// ── GET /api/companies/:companyId/sequences/:id ───────────────
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const sequence = await sequenceService.getById(req.params.id);
  sendSuccess(res, sequence);
}));

// ── POST /api/companies/:companyId/sequences ──────────────────
router.post('/', validate({ body: createSequenceSchema }), asyncHandler(async (req: Request, res: Response) => {
  const sequence = await sequenceService.create(req.params.companyId, req.body);
  sendSuccess(res, sequence, 201);
}));

// ── PUT /api/companies/:companyId/sequences/:id ───────────────
router.put('/:id', validate({ body: updateSequenceSchema }), asyncHandler(async (req: Request, res: Response) => {
  const sequence = await sequenceService.update(req.params.id, req.body);
  sendSuccess(res, sequence);
}));

// ── DELETE /api/companies/:companyId/sequences/:id ───────────
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await sequenceService.delete(req.params.id);
  sendSuccess(res, { message: 'Secuencia eliminada' });
}));

// ── POST /api/companies/:companyId/sequences/:id/enroll/:leadId
router.post('/:id/enroll/:leadId', asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await sequenceService.enrollLead(req.params.leadId, req.params.id);
  sendSuccess(res, enrollment, 201);
}));

// ── GET /api/companies/:companyId/leads/:leadId/enrollments ───
router.get('/lead/:leadId/enrollments', asyncHandler(async (req: Request, res: Response) => {
  const enrollments = await sequenceService.getEnrollmentsByLead(req.params.leadId);
  sendSuccess(res, enrollments);
}));

// ── PATCH /api/companies/:companyId/enrollments/:id/pause ─────
router.patch('/enrollments/:id/pause', asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await sequenceService.pauseEnrollment(req.params.id);
  sendSuccess(res, enrollment);
}));

// ── PATCH /api/companies/:companyId/enrollments/:id/resume ────
router.patch('/enrollments/:id/resume', asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await sequenceService.resumeEnrollment(req.params.id);
  sendSuccess(res, enrollment);
}));

// ── PATCH /api/companies/:companyId/enrollments/:id/cancel ────
router.patch('/enrollments/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await sequenceService.cancelEnrollment(req.params.id);
  sendSuccess(res, enrollment);
}));

export default router;
