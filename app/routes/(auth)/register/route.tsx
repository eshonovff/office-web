import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { customerAuthApi } from '~/api/customerAuth';
import { ExternalAuthButtons } from '~/components/auth/ExternalAuthButtons';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { authFailureMessage } from '~/lib/signIn';
import { createRegisterSchema, type RegisterForm } from '~/validations/customerAuth';

export default function RegisterPage() {
  const { t } = useTranslation(['customerAuth', 'auth', 'common']);
  const { t: tVal } = useTranslation('validation');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const schema = createRegisterSchema(tVal);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const {
    mutate,
    isPending,
    error: registerError,
  } = useMutation({
    mutationFn: customerAuthApi.register,
    onSuccess: (_response, variables) => {
      navigate(`/verify-email?email=${encodeURIComponent(variables.email)}`);
    },
  });

  const isSubmitting = isFormSubmitting || isPending;
  const failure = registerError ? authFailureMessage(registerError) : null;
  const errorMessage = failure && ('text' in failure ? failure.text : t(failure.key));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">{t('register.title')}</h2>
        <p className="text-muted-foreground">{t('register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
        <FormInput control={control} name="fullName" label={t('register.fullName')} type="text" autoComplete="name" />
        <FormInput control={control} name="email" label={t('register.email')} type="email" autoComplete="email" />
        <FormInput
          control={control}
          name="password"
          label={t('register.password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          endIcon={
            showPassword ? (
              <EyeOff className="h-4 w-4 cursor-pointer" onClick={() => setShowPassword(false)} />
            ) : (
              <Eye className="h-4 w-4 cursor-pointer" onClick={() => setShowPassword(true)} />
            )
          }
        />

        {registerError && (
          <div role="alert" className="text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('register.submitting') : t('register.submit')}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {t('register.haveAccount')}{' '}
        <Link to="/login" className="text-primary hover:underline">
          {t('register.loginLink')}
        </Link>
      </p>

      <ExternalAuthButtons />
    </div>
  );
}
