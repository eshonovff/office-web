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
import { useInboxBreakpoint } from './useInboxBreakpoint';
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

export type InboxMobileView = 'list' | 'thread' | 'info';

interface InboxMobileViewInputs {
  selectedId: string | null;
  infoOpen: boolean;
}

// On a single-pane (mobile) screen, exactly one of these three panes is on
// screen at a time, driven entirely by URL state (?conversation, ?panel=info)
// so the browser's own back button walks the same stack the UI does.
export function getInboxMobileView({ selectedId, infoOpen }: InboxMobileViewInputs): InboxMobileView {
  if (selectedId && infoOpen) return 'info';
  if (selectedId) return 'thread';
  return 'list';
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
  const infoOpen = searchParams.get('panel') === 'info';
  const breakpoint = useInboxBreakpoint();
  const mobileView = getInboxMobileView({ selectedId, infoOpen });

  function selectConversation(id: string) {
    // Push (the default for setSearchParams) so opening a conversation from
    // the list is its own history entry — the back button can return to the
    // list instead of leaving /inbox entirely.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('conversation', id);
        next.delete('panel');
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
        <div
          className={cn(
            'flex items-center justify-between gap-2 px-1',
            breakpoint === 'mobile' && mobileView !== 'list' && 'hidden'
          )}>
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

        <div className="grid min-h-0 grid-cols-1 gap-3 md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_300px]">
          <div
            className={cn(
              'bg-sidebar min-h-0 rounded-xl',
              breakpoint === 'mobile' && mobileView !== 'list' && 'hidden'
            )}>
            <ConversationList
              channelOptions={channelOptions}
              selectedId={selectedId}
              draggable={canAssign}
              onSelect={selectConversation}
            />
          </div>

          {/* Kept mounted alongside the list (never conditionally unmounted) so
              switching panes on mobile doesn't lose either one's scroll
              position — see getInboxMobileView / R4 for the thread's own
              auto-scroll behavior. */}
          <div
            className={cn(
              'bg-sidebar min-h-0 rounded-xl',
              breakpoint === 'mobile' && mobileView !== 'thread' && 'hidden'
            )}>
            {selectedId ? (
              <MessageThread conversationId={selectedId} conversation={conversation ?? null} />
            ) : (
              <EmptyState message={t('selectConversation')} className="h-full" />
            )}
          </div>

          {/* Permanent third column only at the desktop tier — on
              mobile/tablet the same info shows as a pushed overlay (R3). */}
          <div className="bg-sidebar hidden min-h-0 rounded-xl xl:block">
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
