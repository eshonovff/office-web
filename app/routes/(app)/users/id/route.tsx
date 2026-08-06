import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useParams } from 'react-router';
import { rolesApi } from '~/api/roles';
import { usersApi } from '~/api/users';
import { ByIdSkeleton } from '~/components/shared/ByIdSkeleton';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { Panel } from '~/components/layout/Panel';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { useForm } from '~/hooks/useForm';
import { updateUserSchema, type UpdateUserForm } from '~/validations/user';
import { PermissionExceptionsPanel } from './components/PermissionExceptionsPanel';
import { RolesPanel } from './components/RolesPanel';
import type { SetUserPermissionsRequest, SetUserRolesRequest, UserPermissionException } from '~/types/user';

type PendingChange =
  { kind: 'roles'; roleIds: string[] } | { kind: 'permissions'; exceptions: UserPermissionException[] };

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['users', 'common']);
  const queryClient = useQueryClient();
  const { can } = useCan();
  const canManage = can(Permissions.Users.Manage);

  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  });
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list, staleTime: 5 * 60_000 });
  const { data: allPermissionKeys = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.listPermissionKeys,
    staleTime: 5 * 60_000,
  });

  const { control, handleSubmit } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema(t)),
    values: user ? { fullName: user.fullName, phone: user.phone ?? '', onlyAssigned: user.onlyAssigned } : undefined,
  });

  const { mutate: updateInfo, isPending: isUpdatingInfo } = useMutation({
    mutationFn: (data: UpdateUserForm) => usersApi.update(id!, { ...data, phone: data.phone || null }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
      toast.success(t('detail.updateSuccess'));
    },
  });

  const { mutate: setRoles, isPending: isSavingRoles } = useMutation({
    mutationFn: (payload: SetUserRolesRequest) => usersApi.setRoles(id!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
      setPendingChange(null);
    },
  });

  const { mutate: setPermissions, isPending: isSavingPermissions } = useMutation({
    mutationFn: (payload: SetUserPermissionsRequest) => usersApi.setPermissions(id!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
      setPendingChange(null);
    },
  });

  function confirmPendingChange() {
    if (!pendingChange) return;
    if (pendingChange.kind === 'roles') setRoles({ roleIds: pendingChange.roleIds });
    else setPermissions({ exceptions: pendingChange.exceptions });
  }

  if (isLoading || !user) {
    return <ByIdSkeleton />;
  }

  const rolePermissions = new Set(
    roles.filter((r) => user.roles.some((ur) => ur.id === r.id)).flatMap((r) => r.permissions)
  );

  return (
    <div className="flex-1 space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{user.fullName}</h1>
        <Badge variant="outline" className={user.isActive ? 'text-success border-success/30' : 'text-muted-foreground'}>
          {user.isActive ? t('active') : t('inactive')}
        </Badge>
      </div>

      <Panel title={t('detail.personalInfo')} className="space-y-4">
        <form
          id="user-info-form"
          onSubmit={handleSubmit((data) => updateInfo(data))}
          className="grid gap-4 sm:grid-cols-2">
          <FormInput control={control} name="fullName" label={t('fields.fullName')} required disabled={!canManage} />
          <FormInput control={control} name="phone" label={t('fields.phone')} disabled={!canManage} />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>{t('fields.username')}</Label>
            <p className="text-muted-foreground text-sm">@{user.username}</p>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch
              id="only-assigned"
              checked={user.onlyAssigned}
              disabled={!canManage}
              onCheckedChange={(checked) =>
                updateInfo({ fullName: user.fullName, phone: user.phone ?? '', onlyAssigned: checked })
              }
            />
            <Label htmlFor="only-assigned">{t('detail.onlyAssigned')}</Label>
          </div>
          <p className="text-muted-foreground text-2xs sm:col-span-2">{t('detail.onlyAssignedHint')}</p>
        </form>
        {canManage && (
          <Button type="submit" form="user-info-form" disabled={isUpdatingInfo}>
            {t('detail.saveInfo')}
          </Button>
        )}
      </Panel>

      {canManage ? (
        <>
          <RolesPanel
            roles={roles}
            selectedRoleIds={user.roles.map((r) => r.id)}
            isSaving={isSavingRoles}
            onSave={(roleIds) => setPendingChange({ kind: 'roles', roleIds })}
          />

          <PermissionExceptionsPanel
            allPermissionKeys={allPermissionKeys}
            rolePermissions={rolePermissions}
            exceptions={user.permissionExceptions}
            isSaving={isSavingPermissions}
            onSave={(exceptions) => setPendingChange({ kind: 'permissions', exceptions })}
          />
        </>
      ) : (
        <Panel title={t('detail.rolesTitle')}>
          <div className="flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <Badge key={role.id} variant="secondary">
                {role.name}
              </Badge>
            ))}
          </div>
        </Panel>
      )}

      <ConfirmDialog
        open={pendingChange !== null}
        onOpenChange={(open) => !open && setPendingChange(null)}
        onConfirm={confirmPendingChange}
        isLoading={isSavingRoles || isSavingPermissions}
        type="warning"
        title={t('roleChangeWarning.title')}
        description={t('roleChangeWarning.description')}
      />
    </div>
  );
}
