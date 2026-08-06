import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { usersApi } from '~/api/users';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { createUserSchema, type CreateUserForm } from '~/validations/user';
import { TemporaryPasswordModal } from '../components/TemporaryPasswordModal';

export default function CreateUserPage() {
  const { t } = useTranslation(['users', 'validation']);
  const { t: tVal } = useTranslation('validation');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ username: string; temporaryPassword: string } | null>(null);

  const schema = createUserSchema(tVal);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', username: '', phone: '' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreated({ username: response.username, temporaryPassword: response.temporaryPassword });
    },
  });

  const isSubmitting = isFormSubmitting || isPending;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">{t('createTitle')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('fields.fullName')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="create-user-form"
            className="space-y-4"
            onSubmit={handleSubmit((data) =>
              mutate({ fullName: data.fullName, username: data.username, phone: data.phone || null })
            )}>
            <FormInput control={control} name="fullName" label={t('fields.fullName')} required />
            <FormInput control={control} name="username" label={t('fields.username')} required />
            <FormInput control={control} name="phone" label={t('fields.phone')} />
            <Button type="submit" disabled={isSubmitting}>
              {t('create')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {created && (
        <TemporaryPasswordModal
          open
          onClose={() => {
            setCreated(null);
            navigate(`/users`);
          }}
          username={created.username}
          temporaryPassword={created.temporaryPassword}
        />
      )}
    </div>
  );
}
