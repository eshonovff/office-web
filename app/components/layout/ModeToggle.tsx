import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

export function ModeToggle() {
  const { t } = useTranslation("common");
  const { theme, setTheme, systemTheme } = useTheme();

  const current = theme === "system" ? systemTheme : theme;

  function toggle() {
    setTheme(current === "dark" ? "light" : "dark");
  }

  return (
    <Button variant="outline" size="icon" onClick={toggle}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t("modeToggle.toggleTheme")}</span>
    </Button>
  );
}
