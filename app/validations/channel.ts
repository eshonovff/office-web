import type { TFunction } from 'i18next';
import { z } from 'zod';

export const CHANNEL_TYPES = ['WhatsApp', 'Instagram', 'Facebook'] as const;

// externalId doubles as WhatsApp's phoneNumberId (inbound webhooks match a
// channel by type + externalId, and Meta's payload only carries
// phone_number_id — see WhatsAppPayloadParser.ExtractChannelExternalId) —
// so the form derives externalId from phoneNumberId instead of asking for
// it twice, making the two impossible to drift apart by a typo.
export const createChannelSchema = (t: TFunction) =>
  z
    .object({
      type: z.enum(CHANNEL_TYPES),
      name: z.string().min(1, t('required', { ns: 'validation' })).max(200, t('stringMax', { ns: 'validation', count: 200 })),
      externalId: z.string().min(1, t('required', { ns: 'validation' })).max(200, t('stringMax', { ns: 'validation', count: 200 })),
      phoneNumberId: z.string().optional(),
      wabaId: z.string().optional(),
      accessToken: z.string().optional(),
      credentialsJson: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.type === 'WhatsApp') {
        if (!data.phoneNumberId?.trim()) ctx.addIssue({ code: 'custom', path: ['phoneNumberId'], message: t('required', { ns: 'validation' }) });
        if (!data.wabaId?.trim()) ctx.addIssue({ code: 'custom', path: ['wabaId'], message: t('required', { ns: 'validation' }) });
        if (!data.accessToken?.trim()) ctx.addIssue({ code: 'custom', path: ['accessToken'], message: t('required', { ns: 'validation' }) });
      } else if (!data.credentialsJson?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['credentialsJson'], message: t('required', { ns: 'validation' }) });
      }
    });

// Credentials are write-only (GET never returns them), so editing can't
// pre-fill wabaId/accessToken — phoneNumberId is shown read-only instead
// (locked to the channel's existing externalId, which PATCH can't change
// anyway). Leaving both wabaId and accessToken blank keeps the stored
// token; filling either one requires the other too, so a half-filled pair
// can never overwrite valid credentials with something incomplete.
export const editChannelSchema = (t: TFunction) =>
  z
    .object({
      name: z.string().min(1, t('required', { ns: 'validation' })).max(200, t('stringMax', { ns: 'validation', count: 200 })),
      isActive: z.boolean(),
      wabaId: z.string().optional(),
      accessToken: z.string().optional(),
      credentialsJson: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const anyTouched = !!(data.wabaId?.trim() || data.accessToken?.trim());
      const allComplete = !!(data.wabaId?.trim() && data.accessToken?.trim());
      if (anyTouched && !allComplete) {
        const message = t('channelCredentialsAllOrNothing', { ns: 'validation' });
        if (!data.wabaId?.trim()) ctx.addIssue({ code: 'custom', path: ['wabaId'], message });
        if (!data.accessToken?.trim()) ctx.addIssue({ code: 'custom', path: ['accessToken'], message });
      }
    });

export type CreateChannelForm = z.infer<ReturnType<typeof createChannelSchema>>;
export type EditChannelForm = z.infer<ReturnType<typeof editChannelSchema>>;
