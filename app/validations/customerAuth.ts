import type { TFunction } from 'i18next';
import { z } from 'zod';

export const createRegisterSchema = (t: TFunction) =>
  z.object({
    fullName: z.string().min(1, t('fullNameRequired', { ns: 'validation' })),
    email: z
      .string()
      .min(1, t('emailRequired', { ns: 'validation' }))
      .email(t('invalidEmail', { ns: 'validation' })),
    password: z.string().min(8, t('passwordMinLength', { ns: 'validation' })),
  });

export const createVerifyEmailSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .min(1, t('emailRequired', { ns: 'validation' }))
      .email(t('invalidEmail', { ns: 'validation' })),
    code: z
      .string()
      .min(1, t('codeRequired', { ns: 'validation' }))
      .length(6, t('codeLength', { ns: 'validation' }))
      .regex(/^\d+$/, t('codeDigitsOnly', { ns: 'validation' })),
  });

export const createResendCodeSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .min(1, t('emailRequired', { ns: 'validation' }))
      .email(t('invalidEmail', { ns: 'validation' })),
  });

export const createForgotPasswordSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t('emailRequired', { ns: 'validation' }))
      .email(t('invalidEmail', { ns: 'validation' })),
  });

// Same bounds as ResetPasswordRequestValidator on the backend.
export const createResetPasswordSchema = (t: TFunction) =>
  z
    .object({
      newPassword: z
        .string()
        .min(8, t('passwordMinLength', { ns: 'validation' }))
        .max(128, t('passwordMaxLength', { ns: 'validation' })),
      confirmPassword: z.string().min(1, t('passwordRequired', { ns: 'validation' })),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('passwordsMustMatch', { ns: 'validation' }),
      path: ['confirmPassword'],
    });

export type RegisterForm = z.infer<ReturnType<typeof createRegisterSchema>>;
export type VerifyEmailForm = z.infer<ReturnType<typeof createVerifyEmailSchema>>;
export type ResendCodeForm = z.infer<ReturnType<typeof createResendCodeSchema>>;
/** Body of POST /api/public/auth/login — sent by the shared sign-in page (/login). */
export type CustomerLoginForm = { email: string; password: string };
export type ForgotPasswordForm = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
export type ResetPasswordForm = z.infer<ReturnType<typeof createResetPasswordSchema>>;
