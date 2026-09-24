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
import { createRegisterSchema, type RegisterForm } from "~/validations/customerAuth";

export default function RegisterPage() {
  const { t } = useTranslation("customerAuth");
  const { t: tVal } = useTranslation("validation");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const schema = createRegisterSchema(tVal);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "" },
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
  // Backend sends a specific reason (already conflict/cooldown text) — prefer it over a
  // generic message when present.
  const errorMessage = (registerError as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t("register.title")}</CardTitle>
          <CardDescription>{t("register.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
            <FormInput control={control} name="fullName" label={t("register.fullName")} type="text" autoComplete="name" />
            <FormInput control={control} name="email" label={t("register.email")} type="email" autoComplete="email" />
            <FormInput
              control={control}
              name="password"
              label={t("register.password")}
              type={showPassword ? "text" : "password"}
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
              <div className="text-destructive flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("register.submitting") : t("register.submit")}
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              {t("register.haveAccount")}{" "}
              <Link to="/account/login" className="text-primary hover:underline">
                {t("register.loginLink")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
