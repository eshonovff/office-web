import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '~/api/projects';
import { usersApi } from '~/api/users';
import { Modal } from '~/components/shared/Modal';
import { Skeleton } from '~/components/ui/skeleton';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';

interface ManageMembersModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSave: (userIds: string[]) => void;
  isSaving: boolean;
}

export function ManageMembersModal({ projectId, open, onClose, onSave, isSaving }: ManageMembersModalProps) {
  const { t } = useTranslation(['projects', 'common']);

  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: open,
  });
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', { isActive: true }],
    queryFn: () => usersApi.list({ isActive: true }),
    enabled: open,
  });

  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    setDraft(project?.members.map((m) => m.userId) ?? []);
  }, [project]);

  function toggle(userId: string, checked: boolean) {
    setDraft((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  }

  const isLoading = isLoadingProject || isLoadingUsers;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('membersTitle')}
      footer={
        <Button disabled={isSaving || isLoading} onClick={() => onSave(draft)}>
          {t('saveMembers')}
        </Button>
      }>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <label
              key={user.id}
              className="hover:bg-accent/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3">
              <Checkbox checked={draft.includes(user.id)} onCheckedChange={(checked) => toggle(user.id, checked)} />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{user.fullName}</span>
                <span className="text-muted-foreground text-2xs">@{user.username}</span>
              </div>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
