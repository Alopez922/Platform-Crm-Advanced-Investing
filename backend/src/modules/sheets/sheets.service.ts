import { google } from 'googleapis';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { sequenceService } from '../sequence/sequence.service';

// ── Autenticación con cuenta de servicio ──────────────────
function getAuthClient() {
  // En producción: usar variables de entorno (Secret Manager)
  // En desarrollo: si existen las vars, usarlas; si no, fallback al archivo local
  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }
  // Fallback para desarrollo local con credentials.json
  const path = require('path');
  const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
  return new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

// ── Leer filas de un Google Sheet ─────────────────────────
async function readSheetRows(spreadsheetId: string, sheetName = 'Sheet1') {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z5000`,
  });

  return response.data.values || [];
}

// ── Detectar todas las pestañas de un Google Sheet ────────
async function getSheetTabNames(spreadsheetId: string): Promise<string[]> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  return (response.data.sheets || []).map((s: any) => s.properties?.title || '').filter(Boolean);
}

// ── Extraer valor de una fila por nombre de columna ───────
function getField(headers: string[], row: string[], ...candidates: string[]): string {
  for (const candidate of candidates) {
    const idx = headers.findIndex(
      (h) => h.toLowerCase().trim() === candidate.toLowerCase().trim()
    );
    if (idx !== -1 && row[idx]) return row[idx].trim();
  }
  return '';
}

// ── Tipo para pestañas ────────────────────────────────────
interface SheetTab {
  name: string;
  sourceLabel: string;
  enabled: boolean;
}

// ── Sync principal: Sheet → Base de datos ─────────────────
export const sheetsService = {

  // Verificar conexión leyendo las primeras filas
  async testConnection(spreadsheetId: string, sheetName = 'Sheet1') {
    try {
      const rows = await readSheetRows(spreadsheetId, sheetName);
      const headers = rows[0] || [];
      return {
        ok: true,
        headers,
        rowCount: rows.length - 1,
        preview: rows.slice(1, 4),
      };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  // Detectar pestañas disponibles en el Sheet
  async detectTabs(spreadsheetId: string) {
    try {
      const tabNames = await getSheetTabNames(spreadsheetId);
      return {
        ok: true,
        tabs: tabNames.map((name) => ({
          name,
          sourceLabel: name,
          enabled: false,
        })),
      };
    } catch (error: any) {
      return { ok: false, error: error.message, tabs: [] };
    }
  },

  // Obtener tabs configuradas para una empresa
  async getTabs(companyId: string) {
    const connection = await prisma.companySheetConnection.findUnique({
      where: { companyId },
    });
    if (!connection) return { tabs: [], spreadsheetId: null };

    const sheetTabs = (connection as any).sheetTabs as SheetTab[] || [];
    return { tabs: sheetTabs, spreadsheetId: connection.spreadsheetId };
  },

  // Guardar configuración de tabs
  async saveTabs(companyId: string, tabs: SheetTab[]) {
    const connection = await prisma.companySheetConnection.findUnique({
      where: { companyId },
    });
    if (!connection) throw new Error('No hay conexión de Sheet configurada');

    await prisma.companySheetConnection.update({
      where: { companyId },
      data: { sheetTabs: tabs as any },
    });

    return { saved: true, tabs };
  },

  // Sincronizar leads desde el Sheet a la BD (todas las pestañas habilitadas)
  async syncLeads(companyId: string) {
    // 1. Obtener configuración de conexión
    const connection = await prisma.companySheetConnection.findUnique({
      where: { companyId },
    });

    if (!connection) throw new Error('No hay una hoja conectada a esta empresa');

    const { spreadsheetId } = connection;
    const sheetTabs = (connection as any).sheetTabs as SheetTab[] || [];

    // Determinar qué pestañas sincronizar
    const enabledTabs = sheetTabs.filter((t) => t.enabled);

    // Si no hay tabs configuradas, usar la pestaña principal (retrocompatible)
    const tabsToSync = enabledTabs.length > 0
      ? enabledTabs.map((t) => ({ name: t.name, sourceLabel: t.sourceLabel }))
      : [{ name: connection.sheetName || 'Sheet1', sourceLabel: 'Google Sheets' }];

    // Marcar sync en progreso
    await prisma.companySheetConnection.update({
      where: { companyId },
      data: { syncStatus: 'SYNCING' },
    });

    try {
      // 2. Obtener la primera etapa (con role ENTRY si existe)
      const firstStage = await prisma.leadStage.findFirst({
        where: { companyId, role: 'ENTRY' as any },
      }) || await prisma.leadStage.findFirst({
        where: { companyId },
        orderBy: { position: 'asc' },
      });
      if (!firstStage) throw new Error('La empresa no tiene etapas configuradas');

      // 3. Obtener emails y teléfonos ya existentes para deduplicar
      const existingLeads = await prisma.lead.findMany({
        where: { companyId },
        select: { email: true, phone: true },
      });
      const existingEmails = new Set(existingLeads.map((l) => l.email).filter(Boolean));
      const existingPhones = new Set(existingLeads.map((l) => l.phone).filter(Boolean));

      // 4. Cargar lista de exclusión
      const excludedEntries = await (prisma as any).syncExcludeList.findMany({
        where: { companyId },
        select: { email: true, phone: true },
      });
      const excludedEmails = new Set(excludedEntries.map((e: any) => e.email).filter(Boolean));
      const excludedPhones = new Set(excludedEntries.map((e: any) => e.phone).filter(Boolean));

      let totalSynced = 0;
      let totalSkipped = 0;
      const allNewLeadNames: string[] = [];
      const tabResults: { tab: string; synced: number; skipped: number }[] = [];

      // 5. Iterar cada pestaña habilitada
      for (const tab of tabsToSync) {
        let tabSynced = 0;
        let tabSkipped = 0;

        try {
          const rows = await readSheetRows(spreadsheetId, tab.name);
          if (rows.length < 2) {
            tabResults.push({ tab: tab.name, synced: 0, skipped: 0 });
            continue;
          }

          const headers = rows[0].map((h: string) => (h || '').trim());
          const dataRows = rows.slice(1);

          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (!row || row.every((cell: string) => !cell)) continue;

            const fullName = getField(headers, row, 'full_name', 'nombre', 'name', 'full name', 'nombre completo');
            const email = getField(headers, row, 'email', 'correo', 'email address');
            const phone = getField(headers, row, 'phone_number', 'phone', 'telefono', 'teléfono', 'celular', 'tel');
            const sheetSource = getField(headers, row, 'platform', 'fuente', 'source', 'canal');
            const leadStatus = getField(headers, row, 'lead_status', 'status', 'estado');

            if (!fullName) { tabSkipped++; continue; }

            // Deduplicar
            if (email && existingEmails.has(email)) { tabSkipped++; continue; }
            if (phone && existingPhones.has(phone)) { tabSkipped++; continue; }
            if (email && excludedEmails.has(email)) { tabSkipped++; continue; }
            if (phone && excludedPhones.has(phone)) { tabSkipped++; continue; }

            // Source: prioridad → valor del sheet > label de pestaña
            const source = sheetSource || tab.sourceLabel || tab.name;

            const customFields: Record<string, string> = {};
            headers.forEach((h: string, idx: number) => {
              if (row[idx]) customFields[h] = row[idx];
            });
            // Agregar metadata de la pestaña origen
            customFields['__sheetTab'] = tab.name;

            const positionInStage = await prisma.lead.count({
              where: { companyId, stageId: firstStage.id },
            });

            const newLead = await prisma.lead.create({
              data: {
                companyId,
                stageId: firstStage.id,
                fullName,
                email: email || null,
                phone: phone || null,
                source,
                customFields,
                position: positionInStage,
                ...(leadStatus ? { tags: [leadStatus] } : {}),
              },
            });

            // Registrar en LeadSyncMap
            await prisma.leadSyncMap.create({
              data: {
                leadId: newLead.id,
                sheetConnectionId: connection.id,
                sheetRowIndex: i + 2,
                sheetRowHash: JSON.stringify(row).substring(0, 255),
                lastSyncedAt: new Date(),
              },
            });

            // Auto-enrollar en secuencia
            try {
              const autoSequence = await prisma.sequence.findFirst({
                where: { companyId, isAutoAssign: true, isActive: true },
              });
              if (autoSequence) {
                await sequenceService.enrollLead(newLead.id, autoSequence.id);
              }
            } catch {
              // No bloquear el sync
            }

            if (email) existingEmails.add(email);
            if (phone) existingPhones.add(phone);
            allNewLeadNames.push(fullName);
            tabSynced++;
          }
        } catch (tabError: any) {
          console.error(`❌ Error sincronizando pestaña "${tab.name}":`, tabError.message);
        }

        tabResults.push({ tab: tab.name, synced: tabSynced, skipped: tabSkipped });
        totalSynced += tabSynced;
        totalSkipped += tabSkipped;
      }

      // 6. Actualizar estado de conexión
      await prisma.companySheetConnection.update({
        where: { companyId },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          syncErrorMsg: null,
        },
      });

      // 7. Notificación
      if (totalSynced > 0) {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { name: true },
        });
        const previewNames = allNewLeadNames.slice(0, 3);
        const remaining = allNewLeadNames.length - previewNames.length;
        const namesStr = previewNames.join(', ') + (remaining > 0 ? ` y ${remaining} más` : '');

        await (prisma as any).notification.create({
          data: {
            companyId,
            type: 'NEW_LEADS',
            title: `👤 ${totalSynced} nuevo${totalSynced > 1 ? 's' : ''} lead${totalSynced > 1 ? 's' : ''} en ${company?.name}`,
            body: namesStr,
            count: totalSynced,
          },
        });
      }

      return { synced: totalSynced, skipped: totalSkipped, tabResults };

    } catch (error: any) {
      await prisma.companySheetConnection.update({
        where: { companyId },
        data: { syncStatus: 'ERROR', syncErrorMsg: error.message },
      });
      throw error;
    }
  },
};
