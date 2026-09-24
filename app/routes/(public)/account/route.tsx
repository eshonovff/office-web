import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { redirect, useNavigate } from "react-router";
import { customerAuthApi } from "~/api/customerAuth";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { refreshCustomerAccessToken } from "~/lib/customerClient";
import { useCustomerAuthStore } from "~/store/useCustomerAuthStore";
import type { Route } from "./+types/route";

// Same shape as (app)/layout.tsx's clientLoader, scaled down to one route: what a verified
// customer can actually do beyond this placeholder is still an open product question, so this
// stays a single guarded route rather than a whole (customer) layout subtree for now.
export async function clientLoader() {
  if (!useCustomerAuthStore.getState().accessToken) {
    try {
      await refreshCustomerAccessToken();
    } catch {
      return redirect("/account/login");
    }
  }

  const customer = await customerAuthApi.me().catch(() => null);
  if (!customer) {
    return redirect("/account/login");
  }

  useCustomerAuthStore.getState().setCustomer(customer);
  return { customer };
}

export default function AccountPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("customerAuth");
  const navigate = useNavigate();

  const { mutate: logout, isPending } = useMutation({
    mutationFn: customerAuthApi.logout,
    onSettled: () => {
      useCustomerAuthStore.getState().clear();
      navigate("/");
    },
  });

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t("account.welcome", { name: loaderData.customer.fullName })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t("account.placeholder")}</p>
          <Button variant="outline" className="w-full" disabled={isPending} onClick={() => logout()}>
            {t("account.logout")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
