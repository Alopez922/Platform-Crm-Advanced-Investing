import { Request, Response } from 'express';
import { stageService } from './stage.service';
import { sendSuccess, asyncHandler } from '../../utils/apiResponse';

export const stageController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const stages = await stageService.getAllByCompany(req.params.companyId as string);
    sendSuccess(res, stages);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const stage = await stageService.create(req.params.companyId as string, req.body);
    sendSuccess(res, stage, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const stage = await stageService.update(req.params.stageId as string, req.body);
    sendSuccess(res, stage);
  }),

  reorder: asyncHandler(async (req: Request, res: Response) => {
    await stageService.reorder(req.body.stages);
    sendSuccess(res, { message: 'Etapas reordenadas correctamente' });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await stageService.delete(req.params.stageId as string);
    sendSuccess(res, { message: 'Etapa eliminada' });
  }),
};
