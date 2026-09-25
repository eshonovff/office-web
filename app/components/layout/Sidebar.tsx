import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader } from "~/components/ui/sidebar";
import { subscriptionRequestKeys, subscriptionRequestsApi } from "~/api/subscriptionRequests";
import { BrandLogo } from "~/components/shared/BrandLogo";
import { getSidebarConfig, getVisibleNavigation } from "~/config/navigation";
import { Permissions } from "~/config/permissions";
import { useCan } from "~/hooks/useCan";
import { NavMain } from "./NavMain";

export function AppSidebar() {
  const { can } = useCan();
  const { t } = useTranslation();

  const navConfig = useMemo(() => getSidebarConfig(t), [t]);
  const visibleItems = useMemo(() => getVisibleNavigation(navConfig, can), [navConfig, can]);

  // Only moderators ask — anyone else would just get a 403. A new receipt also refreshes this
  // at once (useNotificationsRealtime); the interval catches another moderator's decisions.
  const canModerate = can(Permissions.Subscriptions.Manage);
  const { data: pendingSubscriptions } = useQuery({
    queryKey: subscriptionRequestKeys.pendingCount,
    queryFn: subscriptionRequestsApi.pendingCount,
    enabled: canModerate,
    refetchInterval: 60_000,
  });

  return (
    <Sidebar collapsible="icon" className="mt-2 border-none">
      <SidebarHeader className="px-4 py-3 group-data-[collapsible=icon]:px-2">
        <BrandLogo nameClassName="text-base group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMain items={visibleItems} badges={{ pendingSubscriptions }} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
