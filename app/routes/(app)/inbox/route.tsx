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
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw, Settings, Wifi } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { channelsApi } from '~/api/channels';
import { conversationsApi } from '~/api/conversations';
import { EmptyState } from '~/components/shared/EmptyState';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
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
import { ASSIGNEE_FILTER_ME, ASSIGNEE_FILTER_UNASSIGNED, useInboxStore } from './store';
import { useInboxBreakpoint } from './useInboxBreakpoint';
import { useInboxRealtime } from './useInboxRealtime';

const VALID_INBOX_STATUSES: ConversationStatus[] = ['New', 'InProgress', 'Waiting', 'Closed'];

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

interface AssigneeOption {
  userId: string;
  fullName: string;
}

// Union of every channel's members, deduped by userId — used for the "Все
// каналы" (no channel filter, no conversation open) case.
export function mergeChannelMembers(memberLists: AssigneeOption[][]): AssigneeOption[] {
  const seen = new Map<string, string>();
  for (const members of memberLists) {
    for (const member of members) {
      seen.set(member.userId, member.fullName);
    }
  }
  return [...seen.entries()].map(([userId, fullName]) => ({ userId, fullName }));
}

interface AssigneeOptionsInputs {
  selectedId: string | null;
  conversationAssignableUsers: AssigneeOption[] | undefined;
  filterChannelId: string | null;
  filterChannelMembers: AssigneeOption[] | undefined;
  allChannelsMembers: AssigneeOption[][];
}

// Three tiers of precedence for the assignee strip's targets — a conversation
// open beats the channel filter, which beats "every accessible channel".
export function getAssigneeOptions({
  selectedId,
  conversationAssignableUsers,
  filterChannelId,
  filterChannelMembers,
  allChannelsMembers,
}: AssigneeOptionsInputs): AssigneeOption[] {
  if (selectedId) return conversationAssignableUsers ?? [];
  if (filterChannelId) return filterChannelMembers ?? [];
  return mergeChannelMembers(allChannelsMembers);
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

interface ResolvedInboxFilterParams {
  status: ConversationStatus | null;
  assigneeFilter: string | null;
}

// Deep-link support for ?status=&assignee= (the dashboard's "45 бе масъул" -> inbox link, and
// similar). Only the assignee sentinels are accepted here, not an arbitrary user id — no
// dashboard link needs to filter to a specific OTHER user, only "me"/"unassigned" — see the
// dashboard build's report for what actually needed this. Pure so it doesn't need a full
// component render to test (this file's own convention, see the other exports above).
export function resolveInboxFilterParams(searchParams: URLSearchParams): ResolvedInboxFilterParams {
  const statusParam = searchParams.get('status');
  const assigneeParam = searchParams.get('assignee');

  return {
    status: statusParam && VALID_INBOX_STATUSES.includes(statusParam as ConversationStatus) ? (statusParam as ConversationStatus) : null,
    assigneeFilter: assigneeParam === ASSIGNEE_FILTER_ME || assigneeParam === ASSIGNEE_FILTER_UNASSIGNED ? assigneeParam : null,
  };
}

export default function InboxPage() {
  const { t } = useTranslation('inbox');
  const { can } = useCan();
  const canAssign = can(Permissions.Inbox.Assign);
  const canManageChannels = can(Permissions.Channels.Manage);
  const queryClient = useQueryClient();
  const hubError = useInboxHub((s) => s.error);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedId = searchParams.get('conversation');
  const infoOpen = searchParams.get('panel') === 'info';
  const breakpoint = useInboxBreakpoint();
  const mobileView = getInboxMobileView({ selectedId, infoOpen });

  // Baseline history depth at the moment /inbox first mounted. Comparing the
  // current depth against it tells goBack() whether there's actually an
  // app-pushed entry to pop — if the page was opened straight to a deep link
  // (?conversation=x from a shared URL, a refresh, ...), there isn't one, and
  // popping would leave the app entirely instead of landing on the list.
  const baselineHistoryIndex = useRef<number | null>(null);
  useEffect(() => {
    baselineHistoryIndex.current = (window.history.state as { idx?: number } | null)?.idx ?? null;
  }, []);

  // One-way sync, on mount only — a deep link (e.g. from the dashboard: "45 бе масъул" ->
  // /inbox?status=New&assignee=unassigned) seeds the filter store once; from then on the filter
  // UI owns it as before (no URL rewriting on every filter change — that's a bigger feature
  // nobody asked for here).
  useEffect(() => {
    const resolved = resolveInboxFilterParams(searchParams);
    const store = useInboxStore.getState();
    if (resolved.status) store.setStatus(resolved.status);
    if (resolved.assigneeFilter) store.setAssigneeFilter(resolved.assigneeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function openInfo() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('panel', 'info');
        return next;
      },
      { preventScrollReset: true }
    );
  }

  // Used by every "close/back" affordance (thread's back arrow, info panel's
  // close) so the browser's own back button and in-app buttons behave the
  // same way: pop one level at a time (info -> thread -> list) instead of
  // jumping straight out of /inbox.
  function goBack() {
    const currentIndex = (window.history.state as { idx?: number } | null)?.idx ?? null;
    const baseline = baselineHistoryIndex.current;
    if (baseline !== null && currentIndex !== null && currentIndex > baseline) {
      navigate(-1);
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (infoOpen) next.delete('panel');
        else next.delete('conversation');
        return next;
      },
      { replace: true, preventScrollReset: true }
    );
  }

  const { data: conversation } = useQuery({
    queryKey: ['conversations', selectedId],
    queryFn: () => conversationsApi.get(selectedId!),
    enabled: !!selectedId,
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

  const filterChannelId = useInboxStore((s) => s.channelId);

  // Assignee strip targets, three tiers of precedence — inbox.assign-gated
  // endpoints for all of them (docs/PROGRESS.md #7):
  // 1. A conversation is open: GET /conversations/{id}/assignable-users —
  //    that conversation's own channel, ignoring the list filter entirely.
  // 2. No conversation open, a specific channel filter is set: GET
  //    /channels/{id}/assignable-users for that one channel (members +
  //    Owner/Admin — unlike GET /channels/{id}, which is members-only).
  // 3. No conversation open, filter is "Все каналы": union of every
  //    /channels/mine channel's assignable users, deduped.
  // Every per-channel query below is keyed by channelId alone (['channels',
  // id, 'assignable-users']), so switching the filter in and out of "Все
  // каналы" reuses whatever's already cached instead of refetching — the
  // same channel's data is the same query regardless of which tier asked
  // for it. Dragging a conversation from a channel other than what the
  // strip currently reflects can still 409 — client.ts surfaces the
  // backend's specific reason instead of a generic "conflict".
  const { data: conversationAssignableUsers } = useQuery({
    queryKey: ['conversations', selectedId, 'assignable-users'],
    queryFn: () => conversationsApi.listAssignableUsers(selectedId!),
    enabled: canAssign && !!selectedId,
    staleTime: 5 * 60_000,
  });

  const { data: filterChannelUsers } = useQuery({
    queryKey: ['channels', filterChannelId, 'assignable-users'],
    queryFn: () => channelsApi.listAssignableUsers(filterChannelId!),
    enabled: canAssign && !selectedId && !!filterChannelId,
    staleTime: 5 * 60_000,
  });

  const allChannelsQueries = useQueries({
    queries: (myChannels ?? []).map((channel) => ({
      queryKey: ['channels', channel.id, 'assignable-users'],
      queryFn: () => channelsApi.listAssignableUsers(channel.id),
      enabled: canAssign && !selectedId && !filterChannelId,
      staleTime: 5 * 60_000,
    })),
  });

  const assigneeOptions = useMemo(
    () =>
      getAssigneeOptions({
        selectedId,
        conversationAssignableUsers,
        filterChannelId,
        filterChannelMembers: filterChannelUsers,
        allChannelsMembers: allChannelsQueries.map((query) => query.data ?? []),
      }),
    // allChannelsQueries is a fresh array every render (useQueries) — its
    // .dataUpdatedAt fingerprint is the real "did any channel's data change"
    // signal; comparing the array reference itself would recompute every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, conversationAssignableUsers, filterChannelId, filterChannelUsers, allChannelsQueries.map((q) => q.dataUpdatedAt).join(',')]
  );

  // The list's "by employee" filter (ConversationList) reuses the same
  // channel-scoped tiers as the assignee strip above, but always at tier
  // 2/3 (selectedId forced null) — it stays scoped to the list's own
  // channel filter regardless of whether a conversation happens to be open.
  const assigneeFilterOptions = useMemo(
    () =>
      getAssigneeOptions({
        selectedId: null,
        conversationAssignableUsers: undefined,
        filterChannelId,
        filterChannelMembers: filterChannelUsers,
        allChannelsMembers: allChannelsQueries.map((query) => query.data ?? []),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterChannelId, filterChannelUsers, allChannelsQueries.map((q) => q.dataUpdatedAt).join(',')]
  );

  const currentUserId = useAuthStore((s) => s.user?.id);

  // 409s (assigning someone outside the conversation's channel) already
  // surface with their specific backend reason via the apiClient interceptor
  // — see client.ts, which now prefers the backend's own detail/title over
  // the generic "conflict" translation.
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
              'bg-sidebar min-h-0 min-w-0 rounded-xl',
              breakpoint === 'mobile' && mobileView !== 'list' && 'hidden'
            )}>
            <ConversationList
              channelOptions={channelOptions}
              selectedId={selectedId}
              draggable={canAssign}
              onSelect={selectConversation}
              assigneeFilterOptions={assigneeFilterOptions}
              canFilterByAssignee={canAssign}
              currentUserId={currentUserId}
            />
          </div>

          {/* Kept mounted alongside the list (never conditionally unmounted) so
              switching panes on mobile doesn't lose either one's scroll
              position — see getInboxMobileView / R4 for the thread's own
              auto-scroll behavior. */}
          <div
            className={cn(
              'bg-sidebar min-h-0 min-w-0 rounded-xl',
              breakpoint === 'mobile' && mobileView !== 'thread' && 'hidden'
            )}>
            {selectedId ? (
              <MessageThread
                conversationId={selectedId}
                conversation={conversation ?? null}
                onBack={breakpoint === 'mobile' ? goBack : undefined}
                onOpenInfo={breakpoint !== 'desktop' ? openInfo : undefined}
              />
            ) : (
              <EmptyState message={t('selectConversation')} className="h-full" />
            )}
          </div>

          {/* Permanent third column only at the desktop tier. */}
          <div className="bg-sidebar hidden min-h-0 min-w-0 rounded-xl xl:block">
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

      {/* Mobile/tablet: same info as a pushed overlay instead of a permanent
          column — closing it (X, overlay tap, Escape, or the hardware back
          button) all funnel through onOpenChange -> goBack(). */}
      {breakpoint !== 'desktop' && (
        <Sheet open={infoOpen} onOpenChange={(open) => !open && goBack()}>
          <SheetContent side="right" className="scrollbar-thin flex flex-col overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{t('conversationInfo')}</SheetTitle>
            </SheetHeader>
            {selectedId && conversation && (
              <ContextPanel
                conversation={conversation}
                isChangingStatus={isChangingStatus}
                onStatusChange={(status) => changeStatus({ id: conversation.id, status })}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </DndContext>
  );
}
