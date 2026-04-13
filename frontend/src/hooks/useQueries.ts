import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi, boardApi, leadsApi, dashboardApi, followUpsApi } from '../api';

// ── Hook: Lista de empresas ──────────────────────────
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await companiesApi.getAll();
      return res.data;
    },
    staleTime: 30000,
  });
}

// ── Hook: Empresa por slug ───────────────────────────
export function useCompanyBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['company', slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await companiesApi.getBySlug(slug);
      return res.data;
    },
    enabled: !!slug,
  });
}

// ── Hook: Tablero Kanban ─────────────────────────────
export function useBoard(companyId: string | null, filters?: { source?: string; search?: string }) {
  return useQuery({
    queryKey: ['board', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await boardApi.getBoard(companyId, filters);
      return res.data;
    },
    enabled: !!companyId,
    staleTime: 10000,
  });
}

// ── Hook: Detalle de lead ────────────────────────────
export function useLeadDetail(companyId: string | null, leadId: string | null) {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!companyId || !leadId) return null;
      const res = await leadsApi.getById(companyId, leadId);
      return res.data;
    },
    enabled: !!companyId && !!leadId,
  });
}

// ── Hook: Mover lead a otra etapa (drag & drop) ─────
export function useMoveLeadStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyId, leadId, stageId, position }: {
      companyId: string;
      leadId: string;
      stageId: string;
      position?: number;
    }) => {
      return leadsApi.moveToStage(companyId, leadId, stageId, position);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board', variables.companyId] });
    },
  });
}

// ── Hook: Crear lead ─────────────────────────────────
export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyId, data }: { companyId: string; data: any }) => {
      return leadsApi.create(companyId, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// ── Hook: Fuentes para filtros ───────────────────────
export function useSources(companyId: string | null) {
  return useQuery({
    queryKey: ['sources', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await leadsApi.getSources(companyId);
      return res.data;
    },
    enabled: !!companyId,
  });
}

// ── Hook: Archivar lead ──────────────────────────────
export function useArchiveLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, leadId }: { companyId: string; leadId: string }) => {
      return leadsApi.archive(companyId, leadId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// ── Hook: Mi Día (Dashboard) ─────────────────────────
export function useMyDay() {
  return useQuery({
    queryKey: ['my-day'],
    queryFn: async () => {
      const res = await dashboardApi.getMyDay();
      return res.data;
    },
    refetchInterval: 60000, // Auto-refresh cada 60 seg
    staleTime: 15000,
  });
}

// ── Hook: Completar follow-up ────────────────────────
export function useCompleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, followUpId }: { companyId: string; followUpId: string }) => {
      return followUpsApi.complete(companyId, followUpId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-day'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
    },
  });
}

// ── Hook: Marcar lead como contactado (desde dashboard) ──
export function useMarkContacted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      return dashboardApi.markContacted(leadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-day'] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
