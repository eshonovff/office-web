import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { customerAuthApi } from "~/api/customerAuth";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { FormInput } from "~/components/ui/form/FormInput";
import { useForm } from "~/hooks/useForm";
import { useCustomerAuthStore } from "~/store/useCustomerAuthStore";
import { createCustomerLoginSchema, type CustomerLoginForm } from "~/validations/customerAuth";

export default function AccountLoginPage() {
  const { t } = useTranslation("customerAuth");
  const { t: tVal } = useTranslation("validation");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const schema = createCustomerLoginSchema(tVal);
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<CustomerLoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const {
    mutate,
    isPending,
    error: loginError,
  } = useMutation({
    mutationFn: customerAuthApi.login,
    onSuccess: (response) => {
      useCustomerAuthStore.getState().setSession(response.accessToken, response.customer);
      navigate("/account");
    },
  });

  const isSubmitting = isFormSubmitting || isPending;
  const status = (loginError as { response?: { status?: number } })?.response?.status;
  const isUnverified = status === 403;
  const errorMessage = isUnverified
    ? t("accountLogin.notVerified")
    : (loginError as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t("accountLogin.title")}</CardTitle>
          <CardDescription>{t("accountLogin.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
            <FormInput control={control} name="email" label={t("accountLogin.email")} type="email" autoComplete="email" />
            <FormInput
              control={control}
              name="password"
              label={t("accountLogin.password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              endIcon={
                showPassword ? (
                  <EyeOff className="h-4 w-4 cursor-pointer" onClick={() => setShowPassword(false)} />
                ) : (
                  <Eye className="h-4 w-4 cursor-pointer" onClick={() => setShowPassword(true)} />
                )
              }
            />

            {loginError && (
              <div className="text-destructive flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
                {isUnverified && (
                  <Link
                    to={`/verify-email?email=${encodeURIComponent(getValues("email"))}`}
                    className="text-primary shrink-0 hover:underline"
                  >
                    {t("accountLogin.goVerify")}
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("accountLogin.submitting") : t("accountLogin.submit")}
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              {t("accountLogin.noAccount")}{" "}
              <Link to="/register" className="text-primary hover:underline">
                {t("accountLogin.registerLink")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
