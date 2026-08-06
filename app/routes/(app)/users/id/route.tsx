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
import { FormCustomSelect } from '~/components/ui/form/FormCustomSelect';
import { FormDateInput } from '~/components/ui/form/FormDateInput';
import { FormInput } from '~/components/ui/form/FormInput';
import { FormTextarea } from '~/components/ui/form/FormTextarea';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { useForm } from '~/hooks/useForm';
import { updateUserSchema, type UpdateUserForm } from '~/validations/user';
import { AvatarPanel } from './components/AvatarPanel';
import { ContractDocumentPanel } from './components/ContractDocumentPanel';
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
    values: user
      ? {
          fullName: user.fullName,
          email: user.email ?? '',
          birthDate: user.birthDate ?? null,
          address: user.address ?? '',
          gender: user.gender ?? null,
          onlyAssigned: user.onlyAssigned,
        }
      : undefined,
  });

  const { mutate: updateInfo, isPending: isUpdatingInfo } = useMutation({
    mutationFn: (data: UpdateUserForm) =>
      usersApi.update(id!, {
        ...data,
        email: data.email || null,
        birthDate: data.birthDate || null,
        address: data.address || null,
        gender: data.gender || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('detail.updateSuccess'));
    },
  });

  const { mutate: setRoles, isPending: isSavingRoles } = useMutation({
    mutationFn: (payload: SetUserRolesRequest) => usersApi.setRoles(id!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setPendingChange(null);
    },
  });

  const { mutate: setPermissions, isPending: isSavingPermissions } = useMutation({
    mutationFn: (payload: SetUserPermissionsRequest) => usersApi.setPermissions(id!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
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

  const genderOptions = [
    { value: 'Male', label: t('fields.genderMale') },
    { value: 'Female', label: t('fields.genderFemale') },
  ];

  return (
    <div className="flex-1 space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">{user.fullName}</h1>
          <span className="text-muted-foreground text-2xs">@{user.username}</span>
        </div>
        <Badge variant="outline" className={user.isActive ? 'text-success border-success/30' : 'text-muted-foreground'}>
          {user.isActive ? t('active') : t('inactive')}
        </Badge>
      </div>

      <AvatarPanel userId={user.id} fullName={user.fullName} hasAvatar={!!user.avatarUrl} canManage={canManage} />

      <Panel title={t('detail.personalInfo')} className="space-y-4">
        <form
          id="user-info-form"
          onSubmit={handleSubmit((data) => updateInfo(data))}
          className="grid gap-4 sm:grid-cols-2">
          <FormInput control={control} name="fullName" label={t('fields.fullName')} required disabled={!canManage} />
          <div className="flex flex-col gap-1.5">
            <Label>{t('fields.phone')}</Label>
            <p className="text-muted-foreground text-sm">{user.phone ?? '—'}</p>
          </div>
          <FormInput control={control} name="email" label={t('fields.email')} type="email" disabled={!canManage} />
          <FormDateInput control={control} name="birthDate" label={t('fields.birthDate')} />
          <div className="flex flex-col gap-1.5">
            <Label>{t('fields.age')}</Label>
            <p className="text-muted-foreground text-sm">{user.age ?? '—'}</p>
          </div>
          <FormCustomSelect
            control={control}
            name="gender"
            label={t('fields.gender')}
            options={genderOptions}
            isClearable
            disabled={!canManage}
          />
          <FormTextarea
            control={control}
            name="address"
            label={t('fields.address')}
            disabled={!canManage}
            className="sm:col-span-2"
          />
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch
              id="only-assigned"
              checked={user.onlyAssigned}
              disabled={!canManage}
              onCheckedChange={(checked) =>
                updateInfo({
                  fullName: user.fullName,
                  email: user.email ?? '',
                  birthDate: user.birthDate ?? null,
                  address: user.address ?? '',
                  gender: user.gender ?? null,
                  onlyAssigned: checked,
                })
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

      <ContractDocumentPanel userId={user.id} hasDocument={user.hasContractDocument} canManage={canManage} />

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
