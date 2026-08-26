import type { TFunction } from 'i18next';
import { z } from 'zod';

export const updateTaskSchema = (t: TFunction) =>
  z.object({
    title: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(200, t('stringMax', { ns: 'validation', count: 200 })),
    description: z.string().max(5000, t('stringMax', { ns: 'validation', count: 5000 })).optional().or(z.literal('')),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
    dueDate: z.string().nullable().optional(),
  });

export type UpdateTaskForm = z.infer<ReturnType<typeof updateTaskSchema>>;

export const createTaskSchema = (t: TFunction) =>
  z.object({
    title: z
      .string()
      .min(1, t('required', { ns: 'validation' }))
      .max(200, t('stringMax', { ns: 'validation', count: 200 })),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  });

export type CreateTaskForm = z.infer<ReturnType<typeof createTaskSchema>>;
