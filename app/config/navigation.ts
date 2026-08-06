import type { TFunction } from "i18next";
import { Inbox, KanbanSquare, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";
import type { ComponentType } from "react";
import { Permissions, type PermissionKey } from "~/config/permissions";
import type { useCan } from "~/hooks/useCan";

export interface NavItem {
  title: string;
  url?: string;
  icon?: ComponentType<{ className?: string }>;
  permission?: PermissionKey | PermissionKey[];
  items?: NavItem[];
}

export const getSidebarConfig = (t: TFunction): NavItem[] => [
  {
    title: t("navigation.dashboard"),
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: t("navigation.users"),
    url: "/users",
    icon: Users,
    permission: Permissions.Users.View,
  },
  {
    title: t("navigation.roles"),
    url: "/roles",
    icon: ShieldCheck,
    permission: Permissions.Roles.View,
  },
  {
    title: t("navigation.projects"),
    url: "/projects",
    icon: KanbanSquare,
    permission: Permissions.Projects.View,
  },
  {
    title: t("navigation.inbox"),
    url: "/inbox",
    icon: Inbox,
    permission: Permissions.Inbox.View,
  },
  {
    title: t("navigation.settings"),
    url: "/settings",
    icon: Settings,
    permission: Permissions.Templates.Manage,
  },
];

type CanFn = ReturnType<typeof useCan>["can"];

export function getVisibleNavigation(items: NavItem[], can: CanFn): NavItem[] {
  return items
    .filter((item) => {
      if (item.items) {
        return getVisibleNavigation(item.items, can).length > 0;
      }
      if (item.permission) {
        return can(item.permission);
      }
      return true;
    })
    .map((item) => ({
      ...item,
      items: item.items ? getVisibleNavigation(item.items, can) : undefined,
    }));
}
