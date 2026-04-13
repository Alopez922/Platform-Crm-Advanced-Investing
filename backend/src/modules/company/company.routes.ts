import { Router } from 'express';
import { companyController } from './company.controller';
import { validate } from '../../middleware/validate';
import { createCompanySchema, updateCompanySchema, companyParamsSchema } from './company.validation';

const router = Router();

router.get('/', companyController.getAll);
router.get('/slug/:slug', companyController.getBySlug);
router.get('/:companyId', validate({ params: companyParamsSchema }), companyController.getById);
router.post('/', validate({ body: createCompanySchema }), companyController.create);
router.put('/:companyId', validate({ params: companyParamsSchema, body: updateCompanySchema }), companyController.update);
router.delete('/:companyId', validate({ params: companyParamsSchema }), companyController.delete);

// ── Stage Management ────────────────
router.get('/:companyId/stages', companyController.getStages);
router.put('/:companyId/stages', companyController.updateStages);
router.post('/:companyId/stages', companyController.addStage);
router.delete('/:companyId/stages/:stageId', companyController.deleteStage);

export default router;
