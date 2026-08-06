import type { TFunction } from 'i18next';
import { z } from 'zod';

const ROLE_KEY_PATTERN = /^[a-z0-9_.]+$/;

export const createRoleSchema = (t: TFunction) =>
  z.object({
    key: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(50, t('stringMax', { ns: 'validation', count: 50 }))
      .regex(ROLE_KEY_PATTERN, t('roleKeyPattern', { ns: 'validation' })),
    name: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(100, t('stringMax', { ns: 'validation', count: 100 })),
    description: z
      .string()
      .max(500, t('stringMax', { ns: 'validation', count: 500 }))
      .optional()
      .or(z.literal('')),
  });

export const updateRoleSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(100, t('stringMax', { ns: 'validation', count: 100 })),
    description: z
      .string()
      .max(500, t('stringMax', { ns: 'validation', count: 500 }))
      .optional()
      .or(z.literal('')),
  });

export type CreateRoleForm = z.infer<ReturnType<typeof createRoleSchema>>;
export type UpdateRoleForm = z.infer<ReturnType<typeof updateRoleSchema>>;
