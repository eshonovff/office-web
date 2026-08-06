import type { TFunction } from "i18next";
import type { FilterConfig } from "~/types/filters";
import type { RoleListItem } from "~/types/role";

export const getUserFilters = (t: TFunction, roles: RoleListItem[]): FilterConfig[] => [
  {
    type: "select",
    key: "isActive",
    label: t("fields.status", { ns: "users" }),
    placeholder: t("filters.all", { ns: "common" }),
    options: [
      { value: "true", label: t("active", { ns: "users" }) },
      { value: "false", label: t("inactive", { ns: "users" }) },
    ],
  },
  {
    type: "select",
    key: "roleId",
    label: t("fields.role", { ns: "users" }),
    placeholder: t("filters.all", { ns: "common" }),
    options: roles.map((role) => ({ value: role.id, label: role.name })),
  },
];
