import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { rolesApi } from '~/api/roles';
import { usersApi } from '~/api/users';
import { ColumnToggle } from '~/components/shared/ColumnToggle';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { CustomInput } from '~/components/shared/CustomInput';
import { DataTable } from '~/components/shared/DataTable';
import { FilterSheet } from '~/components/shared/FilterSheet';
import { Button } from '~/components/ui/button';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { useDataTable } from '~/hooks/useDataTable';
import { useDebounce } from '~/hooks/useDebounce';
import { getColumns } from './configs/columns';
import { getUserFilters } from './configs/filters';
import { TemporaryPasswordModal } from './components/TemporaryPasswordModal';
import { useUsersModals, useUsersStore } from './store';

export default function UsersPage() {
  const { t } = useTranslation(['users', 'common']);
  const queryClient = useQueryClient();
  const { can } = useCan();

  const deactivateModal = useUsersModals((s) => s.deactivate);
  const activateModal = useUsersModals((s) => s.activate);
  const resetPasswordModal = useUsersModals((s) => s.resetPassword);
  const [revealedPassword, setRevealedPassword] = useState<{ username: string; temporaryPassword: string } | null>(
    null
  );

  const { search, filters, setSearch, setFilters, resetFilters } = useUsersStore();
  const debouncedSearch = useDebounce(search);

  const isActiveFilter = filters.find((f) => f.key === 'isActive')?.value as string | undefined;
  const roleIdFilter = filters.find((f) => f.key === 'roleId')?.value as string | undefined;

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      roleId: roleIdFilter || undefined,
      isActive: isActiveFilter === undefined ? undefined : isActiveFilter === 'true',
    }),
    [debouncedSearch, roleIdFilter, isActiveFilter]
  );

  const {
    data: users = [],
    isLoading,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: () => usersApi.list(queryParams),
  });

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list, staleTime: 5 * 60_000 });

  const columns = useMemo(() => getColumns({ t }), [t]);
  const filterConfig = useMemo(() => getUserFilters(t, roles), [t, roles]);

  const { table } = useDataTable({ columns, data: users, storageKey: 'users-table-columns' });

  const { mutate: setActive, isPending: isSetActivePending } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usersApi.setActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(isActive ? t('activateSuccess') : t('deactivateSuccess'));
      deactivateModal.close();
      activateModal.close();
    },
  });

  const { mutate: resetPassword, isPending: isResetPending } = useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id),
    onSuccess: (response) => {
      const targetId = resetPasswordModal.data;
      const user = users.find((u) => u.id === targetId);
      resetPasswordModal.close();
      setRevealedPassword({ username: user?.username ?? '', temporaryPassword: response.temporaryPassword });
    },
  });

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CustomInput
            placeholder={`${t('search', { ns: 'common' })}...`}
            className="w-full sm:max-w-96"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<Search className="text-muted-foreground h-4 w-4" />}
          />
          <div className="flex items-center gap-2 overflow-x-auto overflow-y-clip pb-1 sm:pb-0">
            <FilterSheet config={filterConfig} filters={filters} onApply={setFilters} onReset={resetFilters} />
            <ColumnToggle table={table} />
            {can(Permissions.Users.Manage) && (
              <Button render={<Link to="/users/create" />} className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('create')}</span>
              </Button>
            )}
          </div>
        </div>

        <DataTable table={table} isLoading={isLoading} isFetching={isFetching} isError={isError} />
      </div>

      <ConfirmDialog
        open={deactivateModal.isOpen}
        onOpenChange={(open) => !open && deactivateModal.close()}
        onConfirm={() => deactivateModal.data && setActive({ id: deactivateModal.data, isActive: false })}
        isLoading={isSetActivePending}
        type="danger"
        title={t('deactivateConfirmTitle')}
        description={t('deactivateConfirmDescription')}
      />

      <ConfirmDialog
        open={activateModal.isOpen}
        onOpenChange={(open) => !open && activateModal.close()}
        onConfirm={() => activateModal.data && setActive({ id: activateModal.data, isActive: true })}
        isLoading={isSetActivePending}
        type="success"
        title={t('activateConfirmTitle')}
        description={t('activateConfirmDescription')}
      />

      <ConfirmDialog
        open={resetPasswordModal.isOpen}
        onOpenChange={(open) => !open && resetPasswordModal.close()}
        onConfirm={() => resetPasswordModal.data && resetPassword(resetPasswordModal.data)}
        isLoading={isResetPending}
        type="warning"
        title={t('resetPasswordConfirmTitle')}
        description={t('resetPasswordConfirmDescription')}
      />

      {revealedPassword && (
        <TemporaryPasswordModal
          open
          onClose={() => setRevealedPassword(null)}
          username={revealedPassword.username}
          temporaryPassword={revealedPassword.temporaryPassword}
        />
      )}
    </div>
  );
}
