import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw, Settings, Wifi } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { channelsApi } from '~/api/channels';
import { conversationsApi } from '~/api/conversations';
import { EmptyState } from '~/components/shared/EmptyState';
import { Button } from '~/components/ui/button';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { cn } from '~/lib/utils';
import { useAuthStore } from '~/store/useAuthStore';
import { useInboxHub } from '~/store/useInboxHub';
import type { HubStatus } from '~/store/createHubStore';
import type { MyChannelListItem } from '~/types/channel';
import type { ConversationStatus } from '~/types/conversation';
import { ASSIGNEE_DROP_PREFIX, AssigneeAvatar } from './components/AssigneeAvatar';
import { ConversationList } from './components/ConversationList';
import { ContextPanel } from './components/ContextPanel';
import { MessageThread } from './components/MessageThread';
import { useInboxRealtime } from './useInboxRealtime';

const CONNECTION_DOT_CLASS = {
  connected: 'bg-success',
  connecting: 'bg-warning',
  reconnecting: 'bg-warning',
  disconnected: 'bg-destructive',
  idle: 'bg-muted-foreground',
} as const;

const CONNECTION_BADGE_CLASS = {
  connected: 'border-success/30 bg-success/10 text-success',
  connecting: 'border-warning/30 bg-warning/10 text-warning',
  reconnecting: 'border-warning/30 bg-warning/10 text-warning',
  disconnected: 'border-destructive/30 bg-destructive/10 text-destructive',
  idle: 'border-muted bg-muted text-muted-foreground',
} as const;

export function getInboxChannelOptions(channels: MyChannelListItem[] | undefined) {
  return (channels ?? []).map((channel) => ({ value: channel.id, label: channel.name }));
}

export function getRealtimeChannelIds(channels: MyChannelListItem[] | undefined) {
  return (channels ?? [])
    .filter((channel) => channel.isActive)
    .filter((channel) => channel.joinable ?? true)
    .map((channel) => channel.id);
}

interface HubStatusInputs {
  channelsFailed: boolean;
  channelsLoading: boolean;
  hubError: string | null;
  hubStatus: HubStatus;
}

// Don't claim "online" until the channel list has loaded and the joins it
// drives have had a chance to succeed — otherwise a failed or still-loading
// GET /channels/mine leaves the filter empty and nothing joined while the
// badge would otherwise show a healthy, connected hub.
export function getEffectiveHubStatus({ channelsFailed, channelsLoading, hubError, hubStatus }: HubStatusInputs): HubStatus {
  if (channelsFailed) return 'disconnected';
  if (channelsLoading) return 'connecting';
  if (hubError) return 'disconnected';
  return hubStatus;
}

export default function InboxPage() {
  const { t } = useTranslation('inbox');
  const { can } = useCan();
  const canAssign = can(Permissions.Inbox.Assign);
  const canManageChannels = can(Permissions.Channels.Manage);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const hubError = useInboxHub((s) => s.error);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('conversation');

  function selectConversation(id: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('conversation', id);
        return next;
      },
      { preventScrollReset: true }
    );
  }

  const { data: conversation } = useQuery({
    queryKey: ['conversations', selectedId],
    queryFn: () => conversationsApi.get(selectedId!),
    enabled: !!selectedId,
  });

  const { data: firstPage } = useQuery({
    queryKey: ['conversations', 'assignee-options'],
    queryFn: () => conversationsApi.list({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const {
    data: myChannels,
    isLoading: channelsLoading,
    isError: channelsFailed,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['channels', 'mine'],
    queryFn: channelsApi.mine,
    staleTime: 5 * 60_000,
  });

  const channelOptions = useMemo(() => {
    return getInboxChannelOptions(myChannels);
  }, [myChannels]);

  const realtimeChannelIds = useMemo(() => {
    return getRealtimeChannelIds(myChannels);
  }, [myChannels]);

  const hubStatus = useInboxRealtime(realtimeChannelIds, selectedId);
  const effectiveHubStatus = getEffectiveHubStatus({ channelsFailed, channelsLoading, hubError, hubStatus });
  const statusLabel = channelsFailed ? t('connectionError.channelsFailed') : hubError ? t(`connectionError.${hubError}`) : t(`connection.${effectiveHubStatus}`);

  // GET /channels/{id} (real channel membership) is gated on channels.manage,
  // which neither seeded inbox role has (see docs/PROGRESS.md #6) — so the
  // assign-by-drag target list is derived from who's already assigned across
  // visible conversations, plus the current user (the single most common
  // target: "assign to me"). Not the full staff roster, but works without
  // a permission every inbox operator would otherwise be denied.
  const assigneeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    if (currentUser) seen.set(currentUser.id, currentUser.fullName);
    for (const item of firstPage?.items ?? []) {
      if (item.assignedTo && item.assignedToName) seen.set(item.assignedTo, item.assignedToName);
    }
    return [...seen.entries()].map(([userId, fullName]) => ({ userId, fullName }));
  }, [firstPage, currentUser]);

  const { mutate: assignConversation } = useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) =>
      conversationsApi.update(id, { assignedTo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
    },
  });

  const { mutate: changeStatus, isPending: isChangingStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConversationStatus }) =>
      conversationsApi.update(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
      toast.success(t('statusUpdated'));
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    if (!overId.startsWith(ASSIGNEE_DROP_PREFIX)) return;

    const assignedTo = overId.slice(ASSIGNEE_DROP_PREFIX.length);
    assignConversation({ id: active.id as string, assignedTo });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-2">
        <div className="flex items-center justify-between gap-2 px-1">
          {canAssign && assigneeOptions.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-2xs">{t('assignee')}:</span>
              <div className="flex gap-1.5">
                {assigneeOptions.map((member) => (
                  <AssigneeAvatar key={member.userId} member={member} />
                ))}
              </div>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {canManageChannels && (
              <Button variant="outline" size="sm" className="gap-1.5" render={<Link to="/channels" />}>
                <Settings className="h-3.5 w-3.5" />
                {t('channelsTitle')}
              </Button>
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs font-medium',
                CONNECTION_BADGE_CLASS[effectiveHubStatus]
              )}
              title={statusLabel}>
              {effectiveHubStatus === 'disconnected' ? <AlertCircle className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              <span>{statusLabel}</span>
              <span className={cn('h-2 w-2 shrink-0 rounded-full', CONNECTION_DOT_CLASS[effectiveHubStatus])} />
            </div>
            {channelsFailed && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={t('retryChannels')}
                title={t('retryChannels')}
                onClick={() => void refetchChannels()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[320px_1fr_300px] gap-3">
          <div className="bg-sidebar min-h-0 rounded-xl">
            <ConversationList
              channelOptions={channelOptions}
              selectedId={selectedId}
              draggable={canAssign}
              onSelect={selectConversation}
            />
          </div>

          <div className="bg-sidebar min-h-0 rounded-xl">
            {selectedId ? (
              <MessageThread conversationId={selectedId} conversation={conversation ?? null} />
            ) : (
              <EmptyState message={t('selectConversation')} className="h-full" />
            )}
          </div>

          <div className="bg-sidebar min-h-0 rounded-xl">
            {selectedId && conversation && (
              <ContextPanel
                conversation={conversation}
                isChangingStatus={isChangingStatus}
                onStatusChange={(status) => changeStatus({ id: conversation.id, status })}
              />
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
