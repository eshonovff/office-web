import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { channelsApi } from '~/api/channels';
import { usersApi } from '~/api/users';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Skeleton } from '~/components/ui/skeleton';

interface ChannelMembersModalProps {
  channelId: string;
  open: boolean;
  onClose: () => void;
}

export function ChannelMembersModal({ channelId, open, onClose }: ChannelMembersModalProps) {
  const { t } = useTranslation(['inbox', 'common']);
  const queryClient = useQueryClient();

  const { data: channel, isLoading: isLoadingChannel } = useQuery({
    queryKey: ['channels', channelId],
    queryFn: () => channelsApi.get(channelId),
    enabled: open,
  });
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', { isActive: true }],
    queryFn: () => usersApi.list({ isActive: true }),
    enabled: open,
  });

  const [draft, setDraft] = useState<string[]>([]);
  useEffect(() => setDraft(channel?.members.map((m) => m.userId) ?? []), [channel]);

  const { mutate: saveMembers, isPending } = useMutation({
    mutationFn: (userIds: string[]) => channelsApi.setMembers(channelId, { userIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channels', channelId] });
      toast.success(t('membersSaved'));
    },
  });

  function toggle(userId: string, checked: boolean) {
    setDraft((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  }

  const isLoading = isLoadingChannel || isLoadingUsers;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={channel ? `${t('manageMembers')} — ${channel.name}` : t('manageMembers')}
      footer={
        <Button disabled={isPending || isLoading} onClick={() => saveMembers(draft)}>
          {t('actions.save', { ns: 'common' })}
        </Button>
      }>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noUsers')}</p>
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
