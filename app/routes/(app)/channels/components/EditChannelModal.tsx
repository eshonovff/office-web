import { zodResolver } from '@hookform/resolvers/zod';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CustomInput } from '~/components/shared/CustomInput';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { FormInput } from '~/components/ui/form/FormInput';
import { FormTextarea } from '~/components/ui/form/FormTextarea';
import { Label } from '~/components/ui/label';
import { useForm } from '~/hooks/useForm';
import { editChannelSchema, type EditChannelForm } from '~/validations/channel';
import type { ChannelListItem, UpdateChannelRequest } from '~/types/channel';

interface EditChannelModalProps {
  channel: ChannelListItem;
  open: boolean;
  onClose: () => void;
  onSave: (payload: UpdateChannelRequest) => void;
  isSaving: boolean;
}

export function EditChannelModal({ channel, open, onClose, onSave, isSaving }: EditChannelModalProps) {
  const { t } = useTranslation(['inbox', 'validation', 'common']);
  const { t: tVal } = useTranslation('validation');
  const isWhatsApp = channel.type === 'WhatsApp';

  const { control, handleSubmit } = useForm<EditChannelForm>({
    resolver: zodResolver(editChannelSchema(tVal)),
    values: { name: channel.name, isActive: channel.isActive, wabaId: '', accessToken: '', credentialsJson: '' },
  });

  function submit(data: EditChannelForm) {
    // Credentials are write-only (GET never returns them), so blank means
    // "keep what's stored" — the backend only overwrites when non-empty.
    // phoneNumberId is locked to the channel's own externalId: PATCH can't
    // change externalId anyway, so a different phoneNumberId here would
    // just silently stop matching inbound webhooks.
    const credentials = isWhatsApp
      ? data.wabaId?.trim() && data.accessToken?.trim()
        ? JSON.stringify({ phoneNumberId: channel.externalId, wabaId: data.wabaId, accessToken: data.accessToken })
        : undefined
      : data.credentialsJson?.trim() || undefined;

    onSave({ name: data.name, isActive: data.isActive, credentials });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('editChannel')}
      footer={
        <Button type="submit" form="edit-channel-form" disabled={isSaving}>
          {t('actions.save', { ns: 'common' })}
        </Button>
      }>
      <form id="edit-channel-form" className="space-y-4" onSubmit={handleSubmit(submit)}>
        <FormInput control={control} name="name" label={t('fields.name')} required />

        <div className="space-y-1.5">
          <Label htmlFor="edit-channel-external-id">{t('fields.externalId')}</Label>
          <CustomInput id="edit-channel-external-id" value={channel.externalId} disabled />
        </div>

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <label className="flex w-fit items-center gap-2 text-sm">
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              {t('fields.isActive')}
            </label>
          )}
        />

        {isWhatsApp ? (
          <>
            <p className="text-muted-foreground text-2xs">{t('editCredentialsHint')}</p>
            <FormInput control={control} name="wabaId" label={t('fields.wabaId')} />
            <FormInput control={control} name="accessToken" type="password" autoComplete="off" label={t('fields.accessToken')} />
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-2xs">{t('editCredentialsHintGeneric')}</p>
            <FormTextarea control={control} name="credentialsJson" label={t('fields.credentials')} rows={4} />
          </>
        )}
      </form>
    </Modal>
  );
}
