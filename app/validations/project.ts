import type { TFunction } from 'i18next';
import { z } from 'zod';

const PROJECT_KEY_PATTERN = /^[A-Z0-9_-]+$/;

export const createProjectSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(100, t('stringMax', { ns: 'validation', count: 100 })),
    key: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(20, t('stringMax', { ns: 'validation', count: 20 }))
      .regex(PROJECT_KEY_PATTERN, t('projectKeyPattern', { ns: 'validation' })),
    color: z.string().max(20).optional().or(z.literal('')),
  });

export type CreateProjectForm = z.infer<ReturnType<typeof createProjectSchema>>;
