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

// Mirrors AppSidebar (staff) — same shell, its own menu (getCustomerSidebarConfig): static,
// no permission gating (a customer has none), and mostly disabled — see that file for why.
export function CustomerSidebar() {
  const { t } = useTranslation('customerAuth');

  const items = getCustomerSidebarConfig(t);

  return (
    <Sidebar collapsible="icon" className="mt-2 border-none">
      <SidebarHeader className="px-4 py-3">
        <span className="text-base font-bold group-data-[collapsible=icon]:hidden">{t('landing.brand')}</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <CustomerNavMain items={items} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <CustomerAccessStatus />
      </SidebarFooter>
    </Sidebar>
  );
}
