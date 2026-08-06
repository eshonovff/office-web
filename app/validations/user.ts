import type { TFunction } from 'i18next';
import { z } from 'zod';

const PHONE_PATTERN = /^(\+992|992)?\d{9}$/;
const AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const createUserSchema = (t: TFunction) =>
  z.object({
    fullName: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(200, t('stringMax', { ns: 'validation', count: 200 })),
    phone: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .regex(PHONE_PATTERN, t('phonePattern', { ns: 'validation' })),
    email: z
      .string()
      .email(t('invalidEmail', { ns: 'validation' }))
      .max(200, t('stringMax', { ns: 'validation', count: 200 }))
      .optional()
      .or(z.literal('')),
    birthDate: z.string().nullable().optional(),
    address: z
      .string()
      .max(500, t('stringMax', { ns: 'validation', count: 500 }))
      .optional()
      .or(z.literal('')),
    gender: z.enum(['Male', 'Female']).nullable().optional(),
    avatar: z
      .instanceof(File)
      .refine((file) => AVATAR_TYPES.includes(file.type), t('avatarType', { ns: 'validation' }))
      .nullable()
      .optional(),
  });

export const updateUserSchema = (t: TFunction) =>
  z.object({
    fullName: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(200, t('stringMax', { ns: 'validation', count: 200 })),
    email: z
      .string()
      .email(t('invalidEmail', { ns: 'validation' }))
      .max(200, t('stringMax', { ns: 'validation', count: 200 }))
      .optional()
      .or(z.literal('')),
    birthDate: z.string().nullable().optional(),
    address: z
      .string()
      .max(500, t('stringMax', { ns: 'validation', count: 500 }))
      .optional()
      .or(z.literal('')),
    gender: z.enum(['Male', 'Female']).nullable().optional(),
    onlyAssigned: z.boolean(),
  });

export type CreateUserForm = z.infer<ReturnType<typeof createUserSchema>>;
export type UpdateUserForm = z.infer<ReturnType<typeof updateUserSchema>>;
