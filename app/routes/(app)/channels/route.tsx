import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { channelsApi } from '~/api/channels';
import { EmptyState } from '~/components/shared/EmptyState';
import { Panel } from '~/components/layout/Panel';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import type { CreateChannelRequest } from '~/types/channel';
import { ChannelMembersModal } from './components/ChannelMembersModal';
import { CreateChannelModal } from './components/CreateChannelModal';

export default function ChannelsPage() {
  const { t } = useTranslation(['inbox', 'common']);
  const queryClient = useQueryClient();
  const [managingChannelId, setManagingChannelId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: channelsApi.list,
  });

  const { mutate: createChannel, isPending: isCreating } = useMutation({
    mutationFn: (payload: CreateChannelRequest) => channelsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success(t('channelCreated'));
      setCreating(false);
    },
  });

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t('channelsTitle')}</h1>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <Panel key={channel.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold">{channel.name}</span>
                  <p className="text-muted-foreground text-2xs">{t(`channelType.${channel.type}`)}</p>
                </div>
                {!channel.isActive && (
                  <Badge variant="outline" className="text-muted-foreground text-2xs">
                    {t('inactive', { ns: 'users' })}
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto gap-1.5"
                onClick={() => setManagingChannelId(channel.id)}>
                <Users className="h-3.5 w-3.5" />
                {t('manageMembers')}
              </Button>
            </Panel>
          ))}
        </div>
      )}

      <CreateChannelModal
        open={creating}
        onClose={() => setCreating(false)}
        isCreating={isCreating}
        onCreate={(payload) => createChannel(payload)}
      />

      {managingChannelId && (
        <ChannelMembersModal
          channelId={managingChannelId}
          open
          onClose={() => setManagingChannelId(null)}
        />
      )}
    </div>
  );
}
