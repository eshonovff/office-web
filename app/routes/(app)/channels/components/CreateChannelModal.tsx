import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { FormCustomSelect } from '~/components/ui/form/FormCustomSelect';
import { FormInput } from '~/components/ui/form/FormInput';
import { FormTextarea } from '~/components/ui/form/FormTextarea';
import { useForm } from '~/hooks/useForm';
import { CHANNEL_TYPES, createChannelSchema, type CreateChannelForm } from '~/validations/channel';
import type { CreateChannelRequest } from '~/types/channel';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateChannelRequest) => void;
  isCreating: boolean;
}

export function CreateChannelModal({ open, onClose, onCreate, isCreating }: CreateChannelModalProps) {
  const { t } = useTranslation(['inbox', 'validation']);
  const { t: tVal } = useTranslation('validation');

  const { control, handleSubmit, watch, setValue, reset } = useForm<CreateChannelForm>({
    resolver: zodResolver(createChannelSchema(tVal)),
    defaultValues: {
      type: 'WhatsApp',
      name: '',
      externalId: '',
      phoneNumberId: '',
      wabaId: '',
      accessToken: '',
      credentialsJson: '',
    },
  });

  const type = watch('type');
  const phoneNumberId = watch('phoneNumberId');
  const isWhatsApp = type === 'WhatsApp';

  // externalId must equal phoneNumberId — inbound WhatsApp webhooks match a
  // channel by type + externalId against Meta's phone_number_id, so a typo
  // here means "Канал ёфт нашуд" for every message. Deriving it instead of
  // asking for it twice makes that mismatch impossible.
  useEffect(() => {
    if (isWhatsApp) setValue('externalId', phoneNumberId ?? '', { shouldValidate: false });
  }, [isWhatsApp, phoneNumberId, setValue]);

  function handleClose() {
    reset();
    onClose();
  }

  function submit(data: CreateChannelForm) {
    const credentials =
      data.type === 'WhatsApp'
        ? JSON.stringify({ phoneNumberId: data.phoneNumberId, wabaId: data.wabaId, accessToken: data.accessToken })
        : (data.credentialsJson ?? '');
    onCreate({ type: data.type, name: data.name, externalId: data.externalId, credentials });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('createChannel')}
      footer={
        <Button type="submit" form="create-channel-form" disabled={isCreating}>
          {t('create')}
        </Button>
      }>
      <form id="create-channel-form" className="space-y-4" onSubmit={handleSubmit(submit)}>
        <FormCustomSelect
          control={control}
          name="type"
          label={t('fields.type')}
          required
          options={CHANNEL_TYPES.map((channelType) => ({ value: channelType, label: t(`channelType.${channelType}`) }))}
        />
        <FormInput control={control} name="name" label={t('fields.name')} required />

        {isWhatsApp ? (
          <>
            <div>
              <FormInput control={control} name="phoneNumberId" label={t('fields.phoneNumberId')} required />
              <p className="text-muted-foreground mt-1 text-2xs">{t('phoneNumberIdHint')}</p>
            </div>
            <FormInput control={control} name="wabaId" label={t('fields.wabaId')} required />
            <FormInput control={control} name="accessToken" type="password" autoComplete="off" label={t('fields.accessToken')} required />
          </>
        ) : (
          <>
            <FormInput control={control} name="externalId" label={t('fields.externalId')} required />
            <FormTextarea control={control} name="credentialsJson" label={t('fields.credentials')} required rows={4} />
          </>
        )}
      </form>
    </Modal>
  );
}
