import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido').optional(),
  logoUrl: z.string().url().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const companyParamsSchema = z.object({
  companyId: z.string().uuid('ID de empresa inválido'),
});
