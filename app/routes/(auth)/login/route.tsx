import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authApi } from '~/api/auth';
import { customerAuthApi } from '~/api/customerAuth';
import { ExternalAuthButtons } from '~/components/auth/ExternalAuthButtons';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { customerLandingPath, isCustomerIdentifier, signInErrorOf, staffLandingPath } from '~/lib/signIn';
import { useAuthStore } from '~/store/useAuthStore';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import { createSignInSchema, type SignInForm } from '~/validations/auth';

// The one sign-in page for everyone: staff with their username, a мизоҷ with their email
// (see lib/signIn.ts for how the two are told apart and why that is safe).
export default function LoginPage() {
  const { t } = useTranslation(['auth', 'customerAuth']);
  const { t: tVal } = useTranslation('validation');
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const schema = createSignInSchema(tVal);
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  const {
    mutate,
    isPending,
    error: signInError,
  } = useMutation({
    mutationFn: async ({ identifier, password }: SignInForm) => {
      const id = identifier.trim();
      if (isCustomerIdentifier(id)) {
        return { kind: 'customer' as const, response: await customerAuthApi.login({ email: id, password }) };
      }
      return { kind: 'staff' as const, response: await authApi.login({ username: id, password }) };
    },
    onSuccess: (result) => {
      const redirectTo = searchParams.get('redirectTo');

      if (result.kind === 'customer') {
        useCustomerAuthStore.getState().setSession(result.response.accessToken, result.response.customer);
        navigate(customerLandingPath(redirectTo));
        return;
      }

      useAuthStore.getState().setSession(result.response.accessToken, result.response.user);
      if (result.response.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      navigate(staffLandingPath(redirectTo, result.response.user.permissions));
    },
  });

  const isSubmitting = isFormSubmitting || isPending;
  const error = signInError ? signInErrorOf(signInError) : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">{t('signIn')}</h2>
        <p className="text-muted-foreground">{t('welcome')}</p>
      </div>

      <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
        <div className="space-y-1.5">
          <FormInput
            control={control}
            name="identifier"
            label={t('identifier')}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
          <p className="text-muted-foreground text-xs">{t('identifierHint')}</p>
        </div>
        <FormInput
          control={control}
          name="password"
          label={t('password')}
          placeholder={t('passwordPlaceholder')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          endIcon={
            showPassword ? (
              <EyeOff className="h-4 w-4 cursor-pointer" onClick={() => setShowPassword(false)} />
            ) : (
              <Eye className="h-4 w-4 cursor-pointer" onClick={() => setShowPassword(true)} />
            )
          }
        />

        {error && (
          <div role="alert" className="text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error === 'invalid' ? t('loginError') : t(`errors.${error}`)}</span>
            {error === 'notVerified' && (
              <Link
                to={`/verify-email?email=${encodeURIComponent(getValues('identifier').trim())}`}
                className="text-primary shrink-0 hover:underline">
                {t('customerAuth:accountLogin.goVerify')}
              </Link>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('submitting') : t('signIn')}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {t('customerAuth:accountLogin.noAccount')}{' '}
        <Link to="/register" className="text-primary hover:underline">
          {t('customerAuth:accountLogin.registerLink')}
        </Link>
      </p>

      <ExternalAuthButtons />
    </div>
  );
}
