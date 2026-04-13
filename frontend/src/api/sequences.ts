import { api } from './client';

// ── Types ─────────────────────────────────────────────────────
export interface SequenceStep {
  id: string;
  sequenceId: string;
  position: number;
  channel: 'EMAIL';
  delayMinutes: number;
  sendAtTime?: string | null;
  subject: string;
  bodyHtml: string;
}

export interface Sequence {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isAutoAssign: boolean;
  createdAt: string;
  steps: SequenceStep[];
  _count?: { enrollments: number };
}

export interface StepExecution {
  id: string;
  enrollmentId: string;
  stepId: string;
  status: 'SCHEDULED' | 'EXECUTING' | 'SENT' | 'FAILED' | 'SKIPPED';
  scheduledAt: string;
  executedAt?: string | null;
  errorMessage?: string | null;
  step: {
    position: number;
    subject: string;
    delayMinutes: number;
    sendAtTime?: string | null;
  };
}

export interface SequenceEnrollment {
  id: string;
  leadId: string;
  sequenceId: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  currentStepPos: number;
  enrolledAt: string;
  pausedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  sequence: { id: string; name: string; description?: string | null };
  executions: StepExecution[];
}

// ── Input type para crear/editar pasos ────────────────────────
export interface SequenceStepInput {
  position: number;
  channel?: 'EMAIL';
  delayMinutes: number;
  sendAtTime?: string;
  subject: string;
  bodyHtml: string;
}

// ── Sequences API ─────────────────────────────────────────────
export const sequencesApi = {
  getAll: (companyId: string): Promise<{ success: boolean; data: Sequence[] }> =>
    api.get(`/companies/${companyId}/sequences`) as any,

  getById: (companyId: string, id: string): Promise<{ success: boolean; data: Sequence }> =>
    api.get(`/companies/${companyId}/sequences/${id}`) as any,

  create: (companyId: string, data: {
    name: string;
    description?: string;
    isAutoAssign?: boolean;
    steps: SequenceStepInput[];
  }) => api.post(`/companies/${companyId}/sequences`, data) as any,

  update: (companyId: string, id: string, data: {
    name?: string;
    description?: string;
    isActive?: boolean;
    isAutoAssign?: boolean;
    steps?: SequenceStepInput[];
  }) =>
    api.put(`/companies/${companyId}/sequences/${id}`, data) as any,

  delete: (companyId: string, id: string) =>
    api.delete(`/companies/${companyId}/sequences/${id}`) as any,

  enrollLead: (companyId: string, sequenceId: string, leadId: string) =>
    api.post(`/companies/${companyId}/sequences/${sequenceId}/enroll/${leadId}`) as any,

  getLeadEnrollments: (companyId: string, leadId: string): Promise<{ success: boolean; data: SequenceEnrollment[] }> =>
    api.get(`/companies/${companyId}/sequences/lead/${leadId}/enrollments`) as any,

  pauseEnrollment: (companyId: string, enrollmentId: string) =>
    api.patch(`/companies/${companyId}/sequences/enrollments/${enrollmentId}/pause`) as any,

  resumeEnrollment: (companyId: string, enrollmentId: string) =>
    api.patch(`/companies/${companyId}/sequences/enrollments/${enrollmentId}/resume`) as any,

  cancelEnrollment: (companyId: string, enrollmentId: string) =>
    api.patch(`/companies/${companyId}/sequences/enrollments/${enrollmentId}/cancel`) as any,
};
