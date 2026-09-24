import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavMain } from "~/components/layout/NavMain";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader } from "~/components/ui/sidebar";
import type { NavItem } from "~/config/navigation";

// Mirrors AppSidebar (staff) — same shell, its own (much shorter, static — no permission
// gating, a customer has none) menu. Only "Профил" exists as a real destination right now;
// more items land here once the open "what does a customer actually do" question is answered.
export function CustomerSidebar() {
  const { t } = useTranslation("customerAuth");

  const items: NavItem[] = [{ title: t("account.profile"), url: "/account", icon: User }];

  return (
    <Sidebar collapsible="icon" className="mt-2 border-none">
      <SidebarHeader className="px-4 py-3">
        <span className="text-base font-bold group-data-[collapsible=icon]:hidden">{t("landing.brand")}</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMain items={items} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
