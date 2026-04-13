import { Request, Response } from 'express';
import { companyService } from './company.service';
import { sendSuccess, sendError, asyncHandler } from '../../utils/apiResponse';

export const companyController = {
  // GET /api/companies
  getAll: asyncHandler(async (_req: Request, res: Response) => {
    const companies = await companyService.getAll();
    sendSuccess(res, companies);
  }),

  // GET /api/companies/:companyId
  getById: asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.getById(req.params.companyId);
    if (!company) return sendError(res, 'Empresa no encontrada', 404);
    sendSuccess(res, company);
  }),

  // GET /api/companies/slug/:slug
  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.getBySlug(req.params.slug);
    if (!company) return sendError(res, 'Empresa no encontrada', 404);
    sendSuccess(res, company);
  }),

  // POST /api/companies
  create: asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.create(req.body);
    sendSuccess(res, company, 201);
  }),

  // PUT /api/companies/:companyId
  update: asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.update(req.params.companyId, req.body);
    sendSuccess(res, company);
  }),

  // DELETE /api/companies/:companyId
  delete: asyncHandler(async (req: Request, res: Response) => {
    await companyService.delete(req.params.companyId);
    sendSuccess(res, { message: 'Empresa desactivada correctamente' });
  }),

  // ── GESTIÓN DE ETAPAS ─────────────────────────────────

  // GET /api/companies/:companyId/stages
  getStages: asyncHandler(async (req: Request, res: Response) => {
    const stages = await companyService.getStages(req.params.companyId);
    sendSuccess(res, stages);
  }),

  // PUT /api/companies/:companyId/stages — batch update
  updateStages: asyncHandler(async (req: Request, res: Response) => {
    const stages = await companyService.updateStages(req.params.companyId, req.body.stages);
    sendSuccess(res, stages);
  }),

  // POST /api/companies/:companyId/stages — agregar etapa
  addStage: asyncHandler(async (req: Request, res: Response) => {
    const stage = await companyService.addStage(req.params.companyId, req.body);
    sendSuccess(res, stage, 201);
  }),

  // DELETE /api/companies/:companyId/stages/:stageId — eliminar etapa
  deleteStage: asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await companyService.deleteStage(req.params.companyId, req.params.stageId);
      sendSuccess(res, result);
    } catch (e: any) {
      sendError(res, e.message, 400);
    }
  }),
};
