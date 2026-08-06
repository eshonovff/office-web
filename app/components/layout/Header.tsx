import BreadCrumbs from "~/components/ui/bread-crumb";
import { LanguageSwitcher } from "~/components/layout/LanguageSwitcher";
import { ModeToggle } from "~/components/layout/ModeToggle";
import { UserNav } from "~/components/layout/UserNav";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { useBreadcrumbTrail } from "~/hooks/useBreadcrumbTrail";

export default function Header() {
  const breadcrumbItems = useBreadcrumbTrail();

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-30 flex h-14 w-full items-center gap-2 border-b px-2.5 backdrop-blur sm:px-3 lg:h-16 lg:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
        <SidebarTrigger className="shrink-0" />
        {breadcrumbItems.length > 0 && <BreadCrumbs items={breadcrumbItems} />}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 lg:gap-2">
        <LanguageSwitcher />
        <ModeToggle />
        <div className="bg-border h-6 w-px shrink-0" aria-hidden="true" />
        <UserNav />
      </div>
    </header>
  );
}
