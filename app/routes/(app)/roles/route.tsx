import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { rolesApi } from '~/api/roles';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { EmptyState } from '~/components/shared/EmptyState';
import { Panel } from '~/components/layout/Panel';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import type { CreateRoleForm } from '~/validations/role';
import { CreateRoleModal } from './components/CreateRoleModal';
import { PermissionMatrixModal } from './components/PermissionMatrixModal';
import type { RoleListItem } from '~/types/role';

export default function RolesPage() {
  const { t } = useTranslation(['roles', 'common']);
  const queryClient = useQueryClient();
  const { can } = useCan();
  const canManage = can(Permissions.Roles.Manage);

  const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleListItem | null>(null);

  const { data: roles = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const { data: allPermissionKeys = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.listPermissionKeys,
    staleTime: 5 * 60_000,
  });

  const { mutate: createRole, isPending: isCreating } = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('createSuccess'));
      setCreating(false);
    },
  });

  const { mutate: setPermissions, isPending: isSavingPermissions } = useMutation({
    mutationFn: ({ id, permissionKeys }: { id: string; permissionKeys: string[] }) =>
      rolesApi.setPermissions(id, { permissionKeys }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('permissionsSaved'));
      setEditingRole(null);
    },
  });

  const { mutate: deleteRole, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('deleteSuccess'));
      setDeletingRole(null);
    },
  });

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        {canManage && (
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('create')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Panel key={role.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{role.name}</span>
                    {role.isSystem && (
                      <Badge variant="outline" className="text-2xs gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {t('systemBadge')}
                      </Badge>
                    )}
                  </div>
                  {role.description && <p className="text-muted-foreground mt-1 text-sm">{role.description}</p>}
                </div>
              </div>
              <p className="text-muted-foreground text-2xs">
                {role.permissions.length} {t('fields.permissions').toLowerCase()}
              </p>
              {canManage && (
                <div className="mt-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingRole(role)}>
                    {t('editPermissions')}
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingRole(role)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      {editingRole && (
        <PermissionMatrixModal
          role={editingRole}
          allPermissionKeys={allPermissionKeys}
          open
          onClose={() => setEditingRole(null)}
          isSaving={isSavingPermissions}
          onSave={(permissionKeys) => setPermissions({ id: editingRole.id, permissionKeys })}
        />
      )}

      <CreateRoleModal
        open={creating}
        onClose={() => setCreating(false)}
        isCreating={isCreating}
        onCreate={(data: CreateRoleForm) =>
          createRole({ key: data.key, name: data.name, description: data.description || null })
        }
      />

      <ConfirmDialog
        open={deletingRole !== null}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        onConfirm={() => deletingRole && deleteRole(deletingRole.id)}
        isLoading={isDeleting}
        type="danger"
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmDescription')}
      />
    </div>
  );
}
