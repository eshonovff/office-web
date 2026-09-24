import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export default function LandingPage() {
  const { t } = useTranslation("customerAuth");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("landing.heroTitle")}</h1>
        <p className="text-muted-foreground text-lg">{t("landing.heroSubtitle")}</p>

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button size="lg" className="w-full sm:w-auto" render={<Link to="/register" />}>
            {t("landing.registerCta")}
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" render={<Link to="/account/login" />}>
            {t("landing.loginCta")}
          </Button>
        </div>

        <div className="pt-8">
          <Link to="/login" className="text-muted-foreground text-sm hover:underline">
            {t("landing.staffLoginLink")}
          </Link>
        </div>
      </div>
    </div>
  );
}
