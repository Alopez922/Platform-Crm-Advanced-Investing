import { api } from './client';

export interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { leads: number };
  sheetConnection?: { lastSyncAt: string | null; syncStatus: string } | null;
  stages?: Stage[];
}

export interface Stage {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  isFinal: boolean;
  _count?: { leads: number };
  leads?: Lead[];
}

export interface Lead {
  id: string;
  companyId: string;
  stageId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string[];
  customFields: any;
  nextFollowUpAt: string | null;
  isArchived: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  stage?: { id: string; name: string; color: string };
  assignments?: { user: { id: string; name: string; avatarUrl: string | null } }[];
  notes?: any[];
  followUps?: any[];
  activities?: any[];
}

// ── Company API ──────────────────────────────────────
export const companiesApi = {
  getAll: (): Promise<{ success: boolean; data: Company[] }> =>
    api.get('/companies') as any,

  getById: (id: string): Promise<{ success: boolean; data: Company }> =>
    api.get(`/companies/${id}`) as any,

  getBySlug: (slug: string): Promise<{ success: boolean; data: Company }> =>
    api.get(`/companies/slug/${slug}`) as any,

  create: (data: Partial<Company>) =>
    api.post('/companies', data) as any,

  update: (id: string, data: Partial<Company>) =>
    api.put(`/companies/${id}`, data) as any,

  delete: (id: string) =>
    api.delete(`/companies/${id}`) as any,
};

// ── Board API ─────────────────────────────────────────
export const boardApi = {
  getBoard: (companyId: string, filters?: { source?: string; search?: string }): Promise<{ success: boolean; data: Stage[] }> =>
    api.get(`/companies/${companyId}/leads/board`, { params: filters }) as any,
};

// ── Lead API ──────────────────────────────────────────
export const leadsApi = {
  getAll: (companyId: string, params?: any): Promise<{ success: boolean; data: any }> =>
    api.get(`/companies/${companyId}/leads`, { params }) as any,

  getById: (companyId: string, leadId: string): Promise<{ success: boolean; data: Lead }> =>
    api.get(`/companies/${companyId}/leads/${leadId}`) as any,

  create: (companyId: string, data: Partial<Lead>) =>
    api.post(`/companies/${companyId}/leads`, data) as any,

  update: (companyId: string, leadId: string, data: Partial<Lead>) =>
    api.put(`/companies/${companyId}/leads/${leadId}`, data) as any,

  moveToStage: (companyId: string, leadId: string, stageId: string, position?: number) =>
    api.patch(`/companies/${companyId}/leads/${leadId}/stage`, { stageId, position }) as any,

  archive: (companyId: string, leadId: string) =>
    api.delete(`/companies/${companyId}/leads/${leadId}`) as any,

  deleteAllArchived: (companyId: string) =>
    api.delete(`/companies/${companyId}/leads/archived/all`) as any,

  getSources: (companyId: string): Promise<{ success: boolean; data: string[] }> =>
    api.get(`/companies/${companyId}/leads/sources`) as any,
};

// ── Notes API ─────────────────────────────────────────
export const notesApi = {
  getByLead: (companyId: string, leadId: string) =>
    api.get(`/companies/${companyId}/leads/${leadId}/notes`) as any,

  create: (companyId: string, leadId: string, content: string) =>
    api.post(`/companies/${companyId}/leads/${leadId}/notes`, { content }) as any,
};

// ── FollowUp API ──────────────────────────────────────
export const followUpsApi = {
  getByCompany: (companyId: string) =>
    api.get(`/companies/${companyId}/followups`) as any,

  create: (companyId: string, leadId: string, data: any) =>
    api.post(`/companies/${companyId}/followups/lead/${leadId}`, data) as any,

  complete: (companyId: string, followUpId: string) =>
    api.patch(`/companies/${companyId}/followups/${followUpId}/complete`) as any,

  skip: (companyId: string, followUpId: string) =>
    api.patch(`/companies/${companyId}/followups/${followUpId}/skip`) as any,
};

// ── Dashboard API ─────────────────────────────────────
export const dashboardApi = {
  getMyDay: (): Promise<{ success: boolean; data: any }> =>
    api.get('/dashboard/my-day') as any,

  markContacted: (leadId: string) =>
    api.post(`/dashboard/mark-contacted/${leadId}`) as any,
};

// ── Stages API ────────────────────────────────────────
export const stagesApi = {
  getByCompany: (companyId: string) =>
    api.get(`/companies/${companyId}/stages`) as any,

  updateAll: (companyId: string, stages: any[]) =>
    api.put(`/companies/${companyId}/stages`, { stages }) as any,

  add: (companyId: string, data: { name: string; color: string; role: string }) =>
    api.post(`/companies/${companyId}/stages`, data) as any,

  remove: (companyId: string, stageId: string) =>
    api.delete(`/companies/${companyId}/stages/${stageId}`) as any,
};

// ── Sheets Tabs API ───────────────────────────────────
export const sheetsTabsApi = {
  detect: (companyId: string) =>
    api.post(`/companies/${companyId}/sheets/tabs/detect`) as any,

  get: (companyId: string) =>
    api.get(`/companies/${companyId}/sheets/tabs`) as any,

  save: (companyId: string, tabs: any[]) =>
    api.put(`/companies/${companyId}/sheets/tabs`, { tabs }) as any,
};
