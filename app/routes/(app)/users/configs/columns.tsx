import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { Eye, KeyRound, Power, PowerOff } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Permissions } from "~/config/permissions";
import { useCan } from "~/hooks/useCan";
import { useUsersModals } from "~/routes/(app)/users/store";
import type { RoleSummary, UserListItem } from "~/types/user";

function UserActionsCell({ row, t }: { row: UserListItem; t: TFunction }) {
  const { can } = useCan();
  const deactivateModal = useUsersModals((s) => s.deactivate);
  const activateModal = useUsersModals((s) => s.activate);
  const resetPasswordModal = useUsersModals((s) => s.resetPassword);

  const canManage = can(Permissions.Users.Manage);

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground tap-target-44 h-8 w-8"
        title={t("actions.view", { ns: "common" })}
        render={<Link to={`/users/${row.id}`} />}>
        <Eye className="h-4 w-4" />
      </Button>
      {canManage && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground tap-target-44 h-8 w-8"
          title={t("resetPassword", { ns: "users" })}
          onClick={() => resetPasswordModal.open(row.id)}>
          <KeyRound className="h-4 w-4" />
        </Button>
      )}
      {canManage &&
        (row.isActive ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive tap-target-44 h-8 w-8"
            title={t("deactivate", { ns: "users" })}
            onClick={() => deactivateModal.open(row.id)}>
            <PowerOff className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-success hover:bg-success/10 hover:text-success tap-target-44 h-8 w-8"
            title={t("activate", { ns: "users" })}
            onClick={() => activateModal.open(row.id)}>
            <Power className="h-4 w-4" />
          </Button>
        ))}
    </div>
  );
}

const columnHelper = createColumnHelper<UserListItem>();

export const getColumns = ({ t }: { t: TFunction }): ColumnDef<UserListItem, any>[] => [
  columnHelper.accessor("fullName", {
    header: t("fields.fullName", { ns: "users" }),
    enableHiding: false,
    cell: (info) => (
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{info.getValue()}</span>
        <span className="text-muted-foreground text-2xs">@{info.row.original.username}</span>
      </div>
    ),
  }),

  columnHelper.accessor("roles", {
    header: t("fields.roles", { ns: "users" }),
    cell: (info) => {
      const roles = info.getValue();
      if (roles.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((role: RoleSummary) => (
            <Badge key={role.id} variant="secondary">
              {role.name}
            </Badge>
          ))}
        </div>
      );
    },
  }),

  columnHelper.accessor("isActive", {
    header: t("fields.status", { ns: "users" }),
    cell: (info) => (
      <Badge variant="outline" className={info.getValue() ? "text-success border-success/30" : "text-muted-foreground"}>
        {info.getValue() ? t("active", { ns: "users" }) : t("inactive", { ns: "users" })}
      </Badge>
    ),
  }),

  columnHelper.display({
    id: "actions",
    enableHiding: false,
    header: () => <div className="text-right">{t("fields.actions", { ns: "users" })}</div>,
    cell: (info) => <UserActionsCell row={info.row.original} t={t} />,
  }),
];
