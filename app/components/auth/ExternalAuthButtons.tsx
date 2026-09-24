import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { customerAuthApi, type ExternalAuthProvider } from "~/api/customerAuth";
import { useCustomerAuthStore } from "~/store/useCustomerAuthStore";
import { AppleSignInButton } from "./AppleSignInButton";
import { GoogleSignInButton } from "./GoogleSignInButton";

const hasGoogle = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
const hasApple = Boolean(import.meta.env.VITE_APPLE_CLIENT_ID && import.meta.env.VITE_APPLE_REDIRECT_URI);

// Shared by /register and /account/login — Google/Apple sign-in is register-or-login in one
// action, there's no separate "sign up with Google" step. Renders nothing at all (not even
// the divider) when neither provider is configured, so an empty page section never shows up.
export function ExternalAuthButtons() {
  const { t } = useTranslation("customerAuth");
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: ({ provider, idToken }: { provider: ExternalAuthProvider; idToken: string }) =>
      customerAuthApi.externalLogin(provider, idToken),
    onSuccess: (response) => {
      useCustomerAuthStore.getState().setSession(response.accessToken, response.customer);
      navigate("/account");
    },
    onError: (error) => {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || t("externalAuth.error"));
    },
  });

  if (!hasGoogle && !hasApple) return null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card text-muted-foreground px-2">{t("externalAuth.divider")}</span>
        </div>
      </div>

      <div className="space-y-2">
        {hasGoogle && <GoogleSignInButton onIdToken={(idToken) => mutation.mutate({ provider: "google", idToken })} />}
        {hasApple && <AppleSignInButton onIdToken={(idToken) => mutation.mutate({ provider: "apple", idToken })} />}
      </div>
    </div>
  );
}
