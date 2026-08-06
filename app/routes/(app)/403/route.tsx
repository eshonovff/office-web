import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export default function ForbiddenPage() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="text-muted-foreground h-12 w-12" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("forbidden.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("forbidden.description")}</p>
      </div>
      <Button render={<Link to="/" />}>{t("forbidden.backHome")}</Button>
    </div>
  );
}
