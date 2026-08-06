import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { supportedLngs, type SupportedLng } from "~/lib/i18n";
import { cn } from "~/lib/utils";

const LANGUAGE_LABELS: Record<SupportedLng, string> = {
  tg: "Тоҷикӣ",
  ru: "Русский",
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language as SupportedLng;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
        <Languages className="h-4 w-4" />
        <span className="sr-only">{LANGUAGE_LABELS[current] ?? current}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        {supportedLngs.map((lng) => (
          <DropdownMenuItem
            key={lng}
            className="cursor-pointer justify-between"
            onClick={() => i18n.changeLanguage(lng)}>
            {LANGUAGE_LABELS[lng]}
            <Check className={cn("h-4 w-4", lng === current ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
