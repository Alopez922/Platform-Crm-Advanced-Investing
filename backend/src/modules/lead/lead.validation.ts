import { z } from 'zod';

export const createLeadSchema = z.object({
  fullName: z.string().min(1, 'El nombre completo es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  stageId: z.string().uuid('ID de etapa inválido').optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const moveLeadSchema = z.object({
  stageId: z.string().uuid('ID de etapa inválido'),
  position: z.number().int().min(0).optional(),
});

export const leadQuerySchema = z.object({
  source: z.string().optional(),
  stageId: z.string().optional(),
  search: z.string().optional(),
  isArchived: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
