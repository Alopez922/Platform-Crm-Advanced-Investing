import { Router } from 'express';
import { leadController } from './lead.controller';
import { validate } from '../../middleware/validate';
import { createLeadSchema, updateLeadSchema, moveLeadSchema } from './lead.validation';

const router = Router({ mergeParams: true });

// Board (Kanban)
router.get('/board', leadController.getBoard);

// Sources (para filtros)
router.get('/sources', leadController.getSources);

// Rutas especiales (deben ir ANTES de /:leadId)
router.delete('/archived/all', leadController.deleteAllArchived);

// CRUD de leads
router.get('/', leadController.getAll);
router.get('/:leadId', leadController.getById);
router.post('/', validate({ body: createLeadSchema }), leadController.create);
router.put('/:leadId', validate({ body: updateLeadSchema }), leadController.update);
router.patch('/:leadId/stage', validate({ body: moveLeadSchema }), leadController.moveToStage);
router.delete('/:leadId', leadController.archive);

export default router;
