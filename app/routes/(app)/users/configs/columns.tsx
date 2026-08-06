import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { Check, Eye, KeyRound, Power, PowerOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { usersApi } from "~/api/users";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Permissions } from "~/config/permissions";
import { useCan } from "~/hooks/useCan";
import { toDayjs } from "~/lib/date";
import { useUsersModals } from "~/routes/(app)/users/store";
import type { RoleSummary, UserListItem } from "~/types/user";

function UserAvatarCell({ userId, fullName, hasAvatar }: { userId: string; fullName: string; hasAvatar: boolean }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const { data: blob } = useQuery({
    queryKey: ["users", userId, "avatar"],
    queryFn: () => usersApi.getAvatarBlob(userId),
    enabled: hasAvatar,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!blob) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <Avatar className="h-8 w-8 shrink-0 rounded-lg">
      <AvatarImage src={objectUrl ?? undefined} className="object-cover" />
      <AvatarFallback className="rounded-lg text-2xs">{fullName.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function UserActionsCell({ row, t }: { row: UserListItem; t: TFunction }) {
  const { can } = useCan();
  const location = useLocation();
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
        render={<Link to={`/users/${row.id}`} state={{ from: location.pathname }} />}>
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
    cell: (info) => {
      const user = info.row.original;
      return (
        <div className="flex items-center gap-2.5">
          <UserAvatarCell userId={user.id} fullName={user.fullName} hasAvatar={!!user.avatarUrl} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{info.getValue()}</span>
            <span className="text-muted-foreground text-2xs">@{user.username}</span>
          </div>
        </div>
      );
    },
  }),

  columnHelper.accessor("phone", {
    header: t("fields.phone", { ns: "users" }),
    cell: (info) => <span className="text-sm">{info.getValue() ?? "—"}</span>,
  }),

  columnHelper.accessor("email", {
    header: t("fields.email", { ns: "users" }),
    cell: (info) => <span className="text-sm">{info.getValue() ?? "—"}</span>,
  }),

  columnHelper.accessor("birthDate", {
    header: t("fields.birthDate", { ns: "users" }),
    cell: (info) => {
      const parsed = toDayjs(info.getValue());
      return <span className="text-sm">{parsed ? parsed.format("DD.MM.YYYY") : "—"}</span>;
    },
  }),

  columnHelper.accessor("age", {
    header: t("fields.age", { ns: "users" }),
    cell: (info) => <span className="text-sm">{info.getValue() ?? "—"}</span>,
  }),

  columnHelper.accessor("gender", {
    header: t("fields.gender", { ns: "users" }),
    cell: (info) => {
      const value = info.getValue();
      if (!value) return <span className="text-muted-foreground text-sm">—</span>;
      return <span className="text-sm">{t(value === "Male" ? "fields.genderMale" : "fields.genderFemale", { ns: "users" })}</span>;
    },
  }),

  columnHelper.accessor("address", {
    header: t("fields.address", { ns: "users" }),
    cell: (info) => <span className="block max-w-56 truncate text-sm">{info.getValue() ?? "—"}</span>,
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

  columnHelper.accessor("hasContractDocument", {
    header: t("fields.hasContractDocument", { ns: "users" }),
    cell: (info) =>
      info.getValue() ? (
        <Check className="text-success h-4 w-4" />
      ) : (
        <X className="text-muted-foreground h-4 w-4" />
      ),
  }),

  columnHelper.accessor("isActive", {
    header: t("fields.status", { ns: "users" }),
    cell: (info) => (
      <Badge variant="outline" className={info.getValue() ? "text-success border-success/30" : "text-muted-foreground"}>
        {info.getValue() ? t("active", { ns: "users" }) : t("inactive", { ns: "users" })}
      </Badge>
    ),
  }),

  columnHelper.accessor("mustChangePassword", {
    header: t("fields.mustChangePassword", { ns: "users" }),
    cell: (info) =>
      info.getValue() ? (
        <Check className="text-success h-4 w-4" />
      ) : (
        <X className="text-muted-foreground h-4 w-4" />
      ),
  }),

  columnHelper.display({
    id: "actions",
    enableHiding: false,
    header: () => <div className="text-right">{t("fields.actions", { ns: "users" })}</div>,
    cell: (info) => <UserActionsCell row={info.row.original} t={t} />,
  }),
];
