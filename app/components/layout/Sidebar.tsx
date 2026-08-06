import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "~/components/ui/sidebar";
import { getSidebarConfig, getVisibleNavigation } from "~/config/navigation";
import { useCan } from "~/hooks/useCan";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavMain } from "./NavMain";

export function AppSidebar() {
  const { can } = useCan();
  const { t } = useTranslation();

  const navConfig = useMemo(() => getSidebarConfig(t), [t]);
  const visibleItems = useMemo(() => getVisibleNavigation(navConfig, can), [navConfig, can]);

  return (
    <Sidebar collapsible="icon" className="mt-2 border-none">
      <SidebarHeader className="px-4 py-3">
        <span className="text-base font-bold group-data-[collapsible=icon]:hidden">Office</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMain items={visibleItems} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="items-center group-data-[collapsible=icon]:items-center">
        <LanguageSwitcher />
      </SidebarFooter>
    </Sidebar>
  );
}
