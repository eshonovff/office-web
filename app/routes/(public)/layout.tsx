import { Link, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { ModeToggle } from "~/components/layout/ModeToggle";

// No auth check here on purpose — unlike (app)/layout.tsx, this subtree (landing, register,
// verify-email, account/login) must stay reachable by anyone, logged in or not.
export default function PublicLayout() {
  const { t } = useTranslation("customerAuth");

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link to="/" className="text-lg font-bold tracking-tight">
          {t("landing.brand")}
        </Link>
        <ModeToggle />
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
