import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, MailCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { customerAuthApi } from '~/api/customerAuth';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { authFailureMessage } from '~/lib/signIn';
import { createForgotPasswordSchema, type ForgotPasswordForm } from '~/validations/customerAuth';

// The backend lets one link out per minute per account; the button waits as long.
const RESEND_COOLDOWN_SECONDS = 60;

// "Forgot password" for a мизоҷ. The answer is the same whether or not the email has an
// account — the page never learns which, so it can never show it.
export default function ForgotPasswordPage() {
  const { t } = useTranslation(['customerAuth', 'auth', 'common']);
  const { t: tVal } = useTranslation('validation');
  const [searchParams] = useSearchParams();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => setSecondsRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const schema = createForgotPasswordSchema(tVal);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
    // Prefilled when the sign-in page already had an email typed in.
    defaultValues: { email: searchParams.get('email') ?? '' },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: (email: string) => customerAuthApi.forgotPassword(email),
    onSuccess: (_response, email) => {
      setSentTo(email);
      setSecondsRemaining(RESEND_COOLDOWN_SECONDS);
    },
  });

  const isSubmitting = isFormSubmitting || isPending;
  const failure = error ? authFailureMessage(error) : null;
  const errorMessage = failure && ('text' in failure ? failure.text : t(failure.key));

  if (sentTo) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <MailCheck className="size-6" />
          </div>
          <h2 className="text-3xl font-bold">{t('forgotPassword.sentTitle')}</h2>
          <p className="text-muted-foreground break-words">{t('forgotPassword.sent', { email: sentTo })}</p>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={secondsRemaining > 0 || isPending}
            onClick={() => mutate(sentTo)}>
            {secondsRemaining > 0
              ? t('forgotPassword.resendCooldown', { seconds: secondsRemaining })
              : t('forgotPassword.resend')}
          </Button>
          <Button variant="ghost" className="w-full" render={<Link to="/login" />}>
            {t('forgotPassword.backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">{t('forgotPassword.title')}</h2>
        <p className="text-muted-foreground">{t('forgotPassword.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit((data) => mutate(data.email))} className="space-y-4">
        <FormInput control={control} name="email" label={t('forgotPassword.email')} type="email" autoComplete="email" />

        {error && (
          <div role="alert" className="text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
        </Button>
      </form>

      <div className="space-y-3 text-center text-sm">
        <Link to="/login" className="text-primary hover:underline">
          {t('forgotPassword.backToLogin')}
        </Link>
        <p className="text-muted-foreground text-xs">{t('forgotPassword.staffHint')}</p>
      </div>
    </div>
  );
}
