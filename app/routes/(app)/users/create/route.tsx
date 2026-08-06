import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { usersApi } from '~/api/users';
import { Panel } from '~/components/layout/Panel';
import { Button } from '~/components/ui/button';
import { FormCustomSelect } from '~/components/ui/form/FormCustomSelect';
import { FormDateInput } from '~/components/ui/form/FormDateInput';
import { FormFileInput } from '~/components/ui/form/FormFileInput';
import { FormInput } from '~/components/ui/form/FormInput';
import { FormTextarea } from '~/components/ui/form/FormTextarea';
import { useForm } from '~/hooks/useForm';
import { createUserSchema, type CreateUserForm } from '~/validations/user';
import { TemporaryPasswordModal } from '../components/TemporaryPasswordModal';

export default function CreateUserPage() {
  const { t } = useTranslation(['users', 'validation', 'common']);
  const { t: tVal } = useTranslation('validation');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{
    id: string;
    username: string;
    temporaryPassword: string;
    smsSent: boolean;
  } | null>(null);

  const schema = createUserSchema(tVal);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', phone: '', email: '', birthDate: null, address: '', gender: null, avatar: null },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreated({
        id: response.id,
        username: response.username,
        temporaryPassword: response.temporaryPassword,
        smsSent: response.smsSent,
      });
    },
  });

  const isSubmitting = isFormSubmitting || isPending;

  const genderOptions = [
    { value: 'Male', label: t('fields.genderMale') },
    { value: 'Female', label: t('fields.genderFemale') },
  ];

  function onSubmit(data: CreateUserForm) {
    mutate({
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      birthDate: data.birthDate || null,
      address: data.address || null,
      gender: data.gender || null,
      avatar: data.avatar ?? null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('createTitle')}</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button type="submit" form="create-user-form" disabled={isSubmitting}>
            {t('create')}
          </Button>
        </div>
      </div>

      <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title={t('detail.avatarTitle')} className="lg:col-span-1">
          <FormFileInput control={control} name="avatar" accept="image/*" aspectRatio="square" />
        </Panel>

        <Panel title={t('mainInfoTitle')} className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput control={control} name="fullName" label={t('fields.fullName')} required />
            <FormInput
              control={control}
              name="phone"
              label={t('fields.phone')}
              placeholder="+992XXXXXXXXX"
              required
            />
            <FormInput
              control={control}
              name="email"
              label={t('fields.email')}
              type="email"
              placeholder="example@mail.com"
            />
            <FormDateInput control={control} name="birthDate" label={t('fields.birthDate')} maxDate={new Date()} />
            <FormCustomSelect
              control={control}
              name="gender"
              label={t('fields.gender')}
              options={genderOptions}
              isClearable
            />
            <FormTextarea control={control} name="address" label={t('fields.address')} className="sm:col-span-2" />
          </div>
        </Panel>
      </form>

      {created && (
        <TemporaryPasswordModal
          open
          onClose={() => {
            setCreated(null);
            navigate(`/users/${created.id}`);
          }}
          username={created.username}
          temporaryPassword={created.temporaryPassword}
          smsSent={created.smsSent}
        />
      )}
    </div>
  );
}
