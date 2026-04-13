import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { sheetsService } from './sheets.service';
import { sendSuccess, sendError, asyncHandler } from '../../utils/apiResponse';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const connectSheetSchema = z.object({
  spreadsheetId: z.string().min(1, 'El ID de la hoja es obligatorio'),
  sheetName: z.string().optional().default('Sheet1'),
  columnMapping: z.record(z.string()).optional().default({}),
});

// GET /api/companies/:companyId/sheets — Estado de conexión
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const connection = await prisma.companySheetConnection.findUnique({
    where: { companyId: req.params.companyId as string },
  });
  sendSuccess(res, connection);
}));

// POST /api/companies/:companyId/sheets/connect — Conectar Google Sheet
router.post('/connect', validate({ body: connectSheetSchema }), asyncHandler(async (req: Request, res: Response) => {
  const companyId = req.params.companyId as string;
  const { spreadsheetId, sheetName, columnMapping } = req.body;

  const connection = await prisma.companySheetConnection.upsert({
    where: { companyId },
    update: { spreadsheetId, sheetName, columnMapping },
    create: { companyId, spreadsheetId, sheetName, columnMapping },
  });

  sendSuccess(res, connection, 201);
}));

// POST /api/companies/:companyId/sheets/test — Probar conexión y ver columnas
router.post('/test', asyncHandler(async (req: Request, res: Response) => {
  const connection = await prisma.companySheetConnection.findUnique({
    where: { companyId: req.params.companyId as string },
  });

  if (!connection) return sendError(res, 'No hay una hoja conectada. Usa /connect primero.', 400);

  const result = await sheetsService.testConnection(
    connection.spreadsheetId,
    connection.sheetName || 'Sheet1'
  );

  if (!result.ok) return sendError(res, `Error al conectar con la hoja: ${result.error}`, 400);
  sendSuccess(res, result);
}));

// POST /api/companies/:companyId/sheets/mapping — Guardar mapeo de columnas
router.post('/mapping', asyncHandler(async (req: Request, res: Response) => {
  const connection = await prisma.companySheetConnection.update({
    where: { companyId: req.params.companyId as string },
    data: { columnMapping: req.body.columnMapping },
  });
  sendSuccess(res, connection);
}));

// POST /api/companies/:companyId/sheets/sync — Sincronización real
router.post('/sync', asyncHandler(async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const result = await sheetsService.syncLeads(companyId as string);
  sendSuccess(res, {
    message: `Sincronización completada: ${result.synced} leads nuevos, ${result.skipped} omitidos`,
    ...result,
  });
}));

// PATCH /api/companies/:companyId/sheets/autosync — Activar/desactivar auto-sync
router.patch('/autosync', asyncHandler(async (req: Request, res: Response) => {
  const { enabled, intervalMinutes } = req.body;
  const connection = await prisma.companySheetConnection.update({
    where: { companyId: req.params.companyId as string },
    data: {
      autoSyncEnabled: enabled,
      ...(intervalMinutes ? { autoSyncIntervalMinutes: intervalMinutes } : {}),
    },
  });
  sendSuccess(res, connection);
}));

// GET /api/companies/:companyId/sheets/status — Estado del último sync
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const connection = await prisma.companySheetConnection.findUnique({
    where: { companyId: req.params.companyId as string },
    select: { syncStatus: true, lastSyncAt: true, syncErrorMsg: true, spreadsheetId: true, sheetName: true },
  });
  sendSuccess(res, connection);
}));

// ── TAB MANAGEMENT ──────────────────────────────────────

// GET /api/companies/:companyId/sheets/tabs — Pestañas configuradas
router.get('/tabs', asyncHandler(async (req: Request, res: Response) => {
  const result = await sheetsService.getTabs(req.params.companyId as string);
  sendSuccess(res, result);
}));

// POST /api/companies/:companyId/sheets/tabs/detect — Detectar pestañas del Sheet
router.post('/tabs/detect', asyncHandler(async (req: Request, res: Response) => {
  const connection = await prisma.companySheetConnection.findUnique({
    where: { companyId: req.params.companyId as string },
  });

  if (!connection) return sendError(res, 'Primero conecta un Google Sheet', 400);

  const result = await sheetsService.detectTabs(connection.spreadsheetId);

  if (!result.ok) return sendError(res, `Error al detectar pestañas: ${result.error}`, 400);

  // Merge con tabs ya guardadas (mantener estado enabled/sourceLabel)
  const savedTabs = ((connection as any).sheetTabs || []) as any[];
  const mergedTabs = result.tabs.map((detected: any) => {
    const saved = savedTabs.find((s: any) => s.name === detected.name);
    return saved || detected;
  });

  sendSuccess(res, { tabs: mergedTabs });
}));

// PUT /api/companies/:companyId/sheets/tabs — Guardar configuración de tabs
router.put('/tabs', asyncHandler(async (req: Request, res: Response) => {
  const result = await sheetsService.saveTabs(req.params.companyId as string, req.body.tabs);
  sendSuccess(res, result);
}));

export default router;
