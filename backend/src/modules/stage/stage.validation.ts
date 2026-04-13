import { z } from 'zod';

export const createStageSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.number().int().min(0).optional(),
  isFinal: z.boolean().optional(),
});

export const updateStageSchema = createStageSchema.partial();

export const reorderStagesSchema = z.object({
  stages: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int().min(0),
  })),
});
