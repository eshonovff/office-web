import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from '~/components/ui/sidebar';
import { getCustomerSidebarConfig } from '~/config/customerNavigation';
import { CustomerAccessStatus } from './CustomerAccessStatus';
import { CustomerNavMain } from './CustomerNavMain';
import { BrandLogo } from '~/components/shared/BrandLogo';
import { customerChatKeys, customerChatsApi } from '~/api/customerChats';

// Mirrors AppSidebar (staff) — same shell, its own menu (getCustomerSidebarConfig): static,
// no permission gating (a customer has none), and mostly disabled — see that file for why.
export function CustomerSidebar() {
  const { t } = useTranslation('customerAuth');

  const items = getCustomerSidebarConfig(t);
  // Refreshed at once by ChatUpdated (useCustomerRealtime); the interval is only a fallback.
  const { data: unreadChats } = useQuery({
    queryKey: customerChatKeys.unreadCount,
    queryFn: customerChatsApi.unreadCount,
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
            <CustomerNavMain items={items} badges={{ unreadChats }} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <CustomerAccessStatus />
      </SidebarFooter>
    </Sidebar>
  );
}
