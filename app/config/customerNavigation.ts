import type { TFunction } from "i18next";
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
} from "lucide-react";

export interface CustomerNavItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  disabled?: boolean;
  isNew?: boolean;
}

// Static — a customer has no permissions to filter by (unlike getSidebarConfig for staff).
// Everything but "Главная" (the one real page today, /account) is disabled: showing the full
// intended menu now, greyed out, rather than only ever revealing an item the moment its page
// ships.
export const getCustomerSidebarConfig = (t: TFunction): CustomerNavItem[] => [
  { title: t("navigation.dashboard", { ns: "common" }), url: "/account", icon: LayoutDashboard },
  { title: t("sidebar.automations", { ns: "customerAuth" }), icon: Workflow, disabled: true },
  { title: t("sidebar.aiManager", { ns: "customerAuth" }), icon: Bot, disabled: true },
  { title: t("sidebar.growthTools", { ns: "customerAuth" }), icon: Rocket, disabled: true },
  { title: t("sidebar.virale", { ns: "customerAuth" }), icon: Flame, disabled: true },
  { title: t("sidebar.chats", { ns: "customerAuth" }), icon: MessageSquare, disabled: true },
  { title: t("sidebar.contacts", { ns: "customerAuth" }), icon: Contact, disabled: true },
  { title: t("sidebar.analytics", { ns: "customerAuth" }), icon: ChartColumn, disabled: true },
  { title: t("sidebar.broadcasts", { ns: "customerAuth" }), icon: Send, disabled: true },
  { title: t("sidebar.training", { ns: "customerAuth" }), icon: GraduationCap, disabled: true },
  { title: t("navigation.settings", { ns: "common" }), icon: Settings, disabled: true },
];
