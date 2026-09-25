import type { TFunction } from 'i18next';
import {
  Bot,
  ChartColumn,
  Contact,
  Flame,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Rocket,
  Send,
  Settings,
  Workflow,
} from 'lucide-react';

export interface CustomerNavItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  disabled?: boolean;
  isNew?: boolean;
  /** A live count next to the title (CustomerNavMain reads it from the `badges` it is given). */
  badgeKey?: 'unreadChats';
}

// Static — a customer has no permissions to filter by (unlike getSidebarConfig for staff).
// Items whose page doesn't exist yet are disabled: the full intended menu is shown now, greyed
// out, rather than revealing an item only the moment its page ships.
export const getCustomerSidebarConfig = (t: TFunction): CustomerNavItem[] => [
  { title: t('navigation.dashboard', { ns: 'common' }), url: '/account', icon: LayoutDashboard },
  { title: t('sidebar.automations', { ns: 'customerAuth' }), url: '/account/automations', icon: Workflow },
  { title: t('sidebar.aiManager', { ns: 'customerAuth' }), icon: Bot, disabled: true },
  { title: t('sidebar.growthTools', { ns: 'customerAuth' }), icon: Rocket, disabled: true },
  { title: t('sidebar.virale', { ns: 'customerAuth' }), icon: Flame, disabled: true },
  {
    title: t('sidebar.chats', { ns: 'customerAuth' }),
    url: '/account/chats',
    icon: MessageSquare,
    badgeKey: 'unreadChats',
  },
  { title: t('sidebar.contacts', { ns: 'customerAuth' }), icon: Contact, disabled: true },
  { title: t('sidebar.analytics', { ns: 'customerAuth' }), icon: ChartColumn, disabled: true },
  { title: t('sidebar.broadcasts', { ns: 'customerAuth' }), icon: Send, disabled: true },
  { title: t('sidebar.training', { ns: 'customerAuth' }), icon: GraduationCap, disabled: true },
  { title: t('navigation.settings', { ns: 'common' }), url: '/account/settings', icon: Settings },
];
