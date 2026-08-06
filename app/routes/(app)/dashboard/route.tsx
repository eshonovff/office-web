import { useTranslation } from "react-i18next";
import { useAuthStore } from "~/store/useAuthStore";

export default function DashboardPage() {
  const { t } = useTranslation("common");
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold">
        {t("dashboard.greeting")}, {user?.fullName}
      </h1>
    </div>
  );
}
