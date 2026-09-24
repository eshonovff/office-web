import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { customerAuthApi } from '~/api/customerAuth';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import { createVerifyEmailSchema, type VerifyEmailForm } from '~/validations/customerAuth';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const { t } = useTranslation('customerAuth');
  const { t: tVal } = useTranslation('validation');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query param, not router state — router state is lost on a hard refresh, and refreshing
  // this exact page (waiting for an email to arrive) is an expected, not edge-case, path.
  const email = searchParams.get('email') ?? '';
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => setSecondsRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const schema = createVerifyEmailSchema(tVal);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<VerifyEmailForm>({
    resolver: zodResolver(schema),
    defaultValues: { email, code: '' },
  });

  const {
    mutate,
    isPending,
    error: verifyError,
  } = useMutation({
    mutationFn: customerAuthApi.verifyEmail,
    onSuccess: (response) => {
      useCustomerAuthStore.getState().setSession(response.accessToken, response.customer);
      navigate('/account');
    },
  });

  const resendMutation = useMutation({
    mutationFn: customerAuthApi.resendCode,
    onSuccess: () => {
      toast.success(t('verifyEmail.resendSuccess'));
      setSecondsRemaining(RESEND_COOLDOWN_SECONDS);
    },
  });

  const isSubmitting = isFormSubmitting || isPending;
  const errorMessage = (verifyError as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

  if (!email) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">{t('verifyEmail.noEmail')}</p>
            <Button className="w-full" render={<Link to="/register" />}>
              {t('register.title')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t('verifyEmail.title')}</CardTitle>
          <CardDescription>{t('verifyEmail.subtitle', { email })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutate({ ...data, email }))} className="space-y-4">
            <FormInput
              control={control}
              name="code"
              label={t('verifyEmail.code')}
              placeholder={t('verifyEmail.codePlaceholder')}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
            />

            {verifyError && (
              <div className="text-destructive flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('verifyEmail.submitting') : t('verifyEmail.submit')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={secondsRemaining > 0 || resendMutation.isPending}
              onClick={() => resendMutation.mutate({ email })}>
              {secondsRemaining > 0
                ? t('verifyEmail.resendCooldown', { seconds: secondsRemaining })
                : t('verifyEmail.resend')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
