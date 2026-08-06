import type { TFunction } from 'i18next';
import { z } from 'zod';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

export const createUserSchema = (t: TFunction) =>
  z.object({
    fullName: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(200, t('stringMax', { ns: 'validation', count: 200 })),
    username: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(100, t('stringMax', { ns: 'validation', count: 100 }))
      .regex(USERNAME_PATTERN, t('usernamePattern', { ns: 'validation' })),
    phone: z
      .string()
      .max(30, t('stringMax', { ns: 'validation', count: 30 }))
      .optional()
      .or(z.literal('')),
  });

export const updateUserSchema = (t: TFunction) =>
  z.object({
    fullName: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(200, t('stringMax', { ns: 'validation', count: 200 })),
    phone: z
      .string()
      .max(30, t('stringMax', { ns: 'validation', count: 30 }))
      .optional()
      .or(z.literal('')),
    onlyAssigned: z.boolean(),
  });

export type CreateUserForm = z.infer<ReturnType<typeof createUserSchema>>;
export type UpdateUserForm = z.infer<ReturnType<typeof updateUserSchema>>;
