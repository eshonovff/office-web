import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { Badge } from '~/components/ui/badge';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '~/components/ui/sidebar';
import type { CustomerNavItem } from '~/config/customerNavigation';

interface CustomerNavMainProps {
  items: CustomerNavItem[];
}

// Flat list, no collapsible sub-groups — unlike NavMain (staff), which needs those. Adds
// disabled (greyed out, not a link — nothing to navigate to yet) and isNew (a small badge)
// on top, neither of which the staff nav has ever needed.
export function CustomerNavMain({ items }: CustomerNavMainProps) {
  const { t } = useTranslation('customerAuth');

  return (
    <SidebarMenu className="flex flex-col gap-1">
      {items.map((item) => {
        const content = (
          <>
            <item.icon />
            <span className="truncate">{item.title}</span>
            {item.isNew && (
              <Badge variant="secondary" className="ml-auto shrink-0 px-1.5 py-0 text-[10px] leading-4">
                {t('sidebar.new')}
              </Badge>
            )}
          </>
        );

        if (item.disabled) {
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton disabled tooltip={item.title} aria-disabled className="opacity-50">
                {content}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.title}>
            {/* `end` only for the home item: /account is a prefix of every мизоҷ URL, while
                "Автоматизатсияҳо" must stay highlighted inside the flow editor below it. */}
            <NavLink to={item.url || '#'} end={item.url === '/account'} className="block w-full">
              {({ isActive }) => (
                <SidebarMenuButton isActive={isActive} tooltip={item.title}>
                  {content}
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
