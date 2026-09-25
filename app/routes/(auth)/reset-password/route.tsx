import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Eye, EyeOff, LinkIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { customerAuthApi } from '~/api/customerAuth';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { authFailureMessage } from '~/lib/signIn';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import { createResetPasswordSchema, type ResetPasswordForm } from '~/validations/customerAuth';

// Opened from the emailed link: /reset-password#token=…  The token rides in the fragment, which
// the browser never sends to a server or in a Referer. It is read once and then dropped from
// the address bar, so it does not stay in the history either.
export default function ResetPasswordPage() {
  const { t } = useTranslation(['customerAuth', 'auth', 'common']);
  const { t: tVal } = useTranslation('validation');
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token'));
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (location.hash) navigate({ pathname: location.pathname, search: location.search }, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  const schema = createResetPasswordSchema(tVal);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: (newPassword: string) => customerAuthApi.resetPassword(token!, newPassword),
    onSuccess: () => {
      // The backend ended every session of the account; drop this browser's copy too.
      useCustomerAuthStore.getState().clear();
      navigate('/login?passwordReset=1', { replace: true });
    },
  });

  const isSubmitting = isFormSubmitting || isPending;
  const response = (error as { response?: { status?: number; data?: { errors?: unknown } } } | null)?.response;
  // A 400 without field errors is the link itself being refused (unknown, used, replaced, expired).
  const linkRefused = response?.status === 400 && !response.data?.errors;
  const failure = error && !linkRefused ? authFailureMessage(error) : null;

  if (!token || linkRefused) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
            <LinkIcon className="size-6" />
          </div>
          <h2 className="text-3xl font-bold">{t('resetPassword.invalidTitle')}</h2>
          <p className="text-muted-foreground">{t('resetPassword.invalid')}</p>
        </div>
        <Button className="w-full" render={<Link to="/forgot-password" />}>
          {t('resetPassword.requestNew')}
        </Button>
      </div>
    );
  }

  const eye = showPassword ? (
    <EyeOff className="h-4 w-4 cursor-pointer" onClick={() => setShowPassword(false)} />
  ) : (
    <Eye className="h-4 w-4 cursor-pointer" onClick={() => setShowPassword(true)} />
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">{t('resetPassword.title')}</h2>
        <p className="text-muted-foreground">{t('resetPassword.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit((data) => mutate(data.newPassword))} className="space-y-4">
        <FormInput
          control={control}
          name="newPassword"
          label={t('resetPassword.newPassword')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          endIcon={eye}
        />
        <FormInput
          control={control}
          name="confirmPassword"
          label={t('resetPassword.confirmPassword')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          endIcon={eye}
        />

        {failure && (
          <div role="alert" className="text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{'text' in failure ? failure.text : t(failure.key)}</span>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
        </Button>
      </form>
    </div>
  );
}
