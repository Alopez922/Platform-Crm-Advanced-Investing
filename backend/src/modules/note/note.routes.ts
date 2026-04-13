import { Router } from 'express';
import { Request, Response } from 'express';
import { noteService } from './note.service';
import { sendSuccess, asyncHandler } from '../../utils/apiResponse';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const noteSchema = z.object({
  content: z.string().min(1, 'El contenido es obligatorio'),
  authorId: z.string().uuid().optional(),
});

// GET /api/companies/:companyId/leads/:leadId/notes
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const notes = await noteService.getByLead(req.params.leadId);
  sendSuccess(res, notes);
}));

// POST /api/companies/:companyId/leads/:leadId/notes
router.post('/', validate({ body: noteSchema }), asyncHandler(async (req: Request, res: Response) => {
  // Para MVP usamos un authorId fijo hasta tener auth
  const authorId = req.body.authorId || 'system';
  const note = await noteService.create(req.params.leadId, authorId, req.body.content);
  sendSuccess(res, note, 201);
}));

// PUT /api/notes/:noteId
router.put('/:noteId', asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.update(req.params.noteId, req.body.content);
  sendSuccess(res, note);
}));

// DELETE /api/notes/:noteId
router.delete('/:noteId', asyncHandler(async (req: Request, res: Response) => {
  await noteService.delete(req.params.noteId);
  sendSuccess(res, { message: 'Nota eliminada' });
}));

export default router;
