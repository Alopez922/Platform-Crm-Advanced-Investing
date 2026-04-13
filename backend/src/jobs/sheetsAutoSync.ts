import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sheetsService } from '../modules/sheets/sheets.service';

/**
 * Auto-sync de Google Sheets
 * 
 * Revisa cada empresa que tenga autoSyncEnabled = true
 * y ejecuta el sync según su intervalo configurado.
 * 
 * Por defecto corre cada 15 minutos.
 * Si una empresa tiene autoSyncIntervalMinutes = 5, se sincroniza cada 5 ciclos de 1 min.
 */
export function startSheetsAutoSync() {
  // Corre cada minuto y decide qué empresas sincronizar
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Buscar conexiones con auto-sync activo
      const connections = await prisma.companySheetConnection.findMany({
        where: { autoSyncEnabled: true },
        select: {
          companyId: true,
          lastSyncAt: true,
          autoSyncIntervalMinutes: true,
          syncStatus: true,
        },
      });

      for (const conn of connections) {
        // No sincronizar si ya está en progreso
        if (conn.syncStatus === 'SYNCING') continue;

        const intervalMs = (conn.autoSyncIntervalMinutes || 30) * 60 * 1000;
        const lastSync = conn.lastSyncAt ? conn.lastSyncAt.getTime() : 0;
        const timeSinceLastSync = now.getTime() - lastSync;

        // Sincronizar si ya pasó el intervalo
        if (timeSinceLastSync >= intervalMs) {
          try {
            const result = await sheetsService.syncLeads(conn.companyId);
            if (result.synced > 0) {
              console.log(`[AutoSync] Empresa ${conn.companyId}: +${result.synced} leads nuevos`);
            }
          } catch (err: any) {
            console.error(`[AutoSync] Error en empresa ${conn.companyId}:`, err.message);
          }
        }
      }
    } catch (err: any) {
      console.error('[AutoSync] Error general:', err.message);
    }
  });

  console.log('✅ Auto-sync de Google Sheets iniciado (revisión cada minuto)');
}
