import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { companyScope } from './middleware/companyScope';

// Rutas
import companyRoutes from './modules/company/company.routes';
import stageRoutes from './modules/stage/stage.routes';
import leadRoutes from './modules/lead/lead.routes';
import noteRoutes from './modules/note/note.routes';
import followUpRoutes from './modules/followup/followup.routes';
import sheetsRoutes from './modules/sheets/sheets.routes';
import automationRoutes from './modules/automation/automation.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import sequenceRoutes from './modules/sequence/sequence.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

const app = express();

// ── Middleware global ──────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ───────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rutas de Empresas (sin scope) ──────────────────────
app.use('/api/companies', companyRoutes);

// ── Rutas con scope de empresa ─────────────────────────
// Todas estas rutas requieren :companyId válido
app.use('/api/companies/:companyId/stages', companyScope, stageRoutes);
app.use('/api/companies/:companyId/leads', companyScope, leadRoutes);
app.use('/api/companies/:companyId/leads/:leadId/notes', companyScope, noteRoutes);
app.use('/api/companies/:companyId/followups', companyScope, followUpRoutes);
app.use('/api/companies/:companyId/sheets', companyScope, sheetsRoutes);
app.use('/api/companies/:companyId/automations', companyScope, automationRoutes);
app.use('/api/companies/:companyId/sequences', companyScope, sequenceRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Manejo de errores ──────────────────────────────────
app.use(errorHandler);

export default app;
