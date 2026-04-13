import { Router } from 'express';
import { stageController } from './stage.controller';
import { validate } from '../../middleware/validate';
import { createStageSchema, updateStageSchema, reorderStagesSchema } from './stage.validation';

const router = Router({ mergeParams: true }); // mergeParams para acceder a :companyId

router.get('/', stageController.getAll);
router.post('/', validate({ body: createStageSchema }), stageController.create);
router.put('/reorder', validate({ body: reorderStagesSchema }), stageController.reorder);
router.put('/:stageId', validate({ body: updateStageSchema }), stageController.update);
router.delete('/:stageId', stageController.delete);

export default router;
