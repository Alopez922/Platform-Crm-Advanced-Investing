import { Request, Response } from 'express';
import { leadService } from './lead.service';
import { sendSuccess, sendError, asyncHandler } from '../../utils/apiResponse';

export const leadController = {
  // GET /api/companies/:companyId/board — Tablero Kanban completo
  getBoard: asyncHandler(async (req: Request, res: Response) => {
    const board = await leadService.getBoard(req.params.companyId as string, {
      source: req.query.source as string | undefined,
      search: req.query.search as string | undefined,
      stageId: req.query.stageId as string | undefined,
    });
    sendSuccess(res, board);
  }),

  // GET /api/companies/:companyId/leads — Lista paginada
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const result = await leadService.getAll(req.params.companyId as string, {
      source: req.query.source as string | undefined,
      stageId: req.query.stageId as string | undefined,
      search: req.query.search as string | undefined,
      isArchived: req.query.isArchived === 'true',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    });
    sendSuccess(res, result);
  }),

  // GET /api/companies/:companyId/leads/:leadId — Detalle
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.getById(req.params.leadId as string);
    if (!lead) return sendError(res, 'Lead no encontrado', 404);
    sendSuccess(res, lead);
  }),

  // POST /api/companies/:companyId/leads — Crear lead
  create: asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.create(req.params.companyId as string, req.body);
    sendSuccess(res, lead, 201);
  }),

  // PUT /api/companies/:companyId/leads/:leadId — Actualizar
  update: asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.update(req.params.leadId as string, req.body);
    sendSuccess(res, lead);
  }),

  // PATCH /api/companies/:companyId/leads/:leadId/stage — Mover etapa (Kanban D&D)
  moveToStage: asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.moveToStage(
      req.params.leadId as string,
      req.body.stageId,
      req.body.position
    );
    sendSuccess(res, lead);
  }),

  // DELETE /api/companies/:companyId/leads/:leadId — Archivar
  archive: asyncHandler(async (req: Request, res: Response) => {
    await leadService.archive(req.params.leadId as string);
    sendSuccess(res, { message: 'Lead archivado' });
  }),

  // GET /api/companies/:companyId/leads/sources — Fuentes para filtros
  getSources: asyncHandler(async (req: Request, res: Response) => {
    const sources = await leadService.getSources(req.params.companyId as string);
    sendSuccess(res, sources);
  }),

  // DELETE /api/companies/:companyId/leads/archived/all — Elimina todos los archivados
  deleteAllArchived: asyncHandler(async (req: Request, res: Response) => {
    const count = await leadService.deleteAllArchived(req.params.companyId as string);
    sendSuccess(res, { message: `${count} leads eliminados permanentemente`, count });
  }),
};
