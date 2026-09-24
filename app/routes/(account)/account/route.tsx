import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useCustomerAuthStore } from "~/store/useCustomerAuthStore";

// Reads the customer straight from the store rather than its own loader — the parent
// (account)/layout.tsx clientLoader already fetched and set it before this ever renders.
export default function AccountProfilePage() {
  const { t } = useTranslation("customerAuth");
  const customer = useCustomerAuthStore((s) => s.customer);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("account.welcome", { name: customer?.fullName })}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{t("account.placeholder")}</p>
      </CardContent>
    </Card>
  );
}
