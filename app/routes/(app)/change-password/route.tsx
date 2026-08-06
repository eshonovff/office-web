import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { authApi } from "~/api/auth";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { FormInput } from "~/components/ui/form/FormInput";
import { useForm } from "~/hooks/useForm";
import { useAuthStore } from "~/store/useAuthStore";
import { createChangePasswordSchema, type ChangePasswordForm } from "~/validations/auth";

export default function ChangePasswordPage() {
  const { t } = useTranslation("auth");
  const { t: tVal } = useTranslation("validation");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const schema = createChangePasswordSchema(tVal);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success(t("changePasswordSuccess"));
      useAuthStore.getState().clear();
      queryClient.clear();
      navigate("/login");
    },
  });

  const isSubmitting = isFormSubmitting || isPending;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("changePasswordTitle")}</CardTitle>
          <CardDescription>{t("changePasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
            <FormInput
              control={control}
              name="currentPassword"
              label={t("currentPassword")}
              type="password"
              autoComplete="current-password"
            />
            <FormInput
              control={control}
              name="newPassword"
              label={t("newPassword")}
              type="password"
              autoComplete="new-password"
            />
            <FormInput
              control={control}
              name="confirmPassword"
              label={t("confirmPassword")}
              type="password"
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("changePasswordSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
