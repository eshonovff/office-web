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
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { conversationsApi } from '~/api/conversations';
import { EmptyState } from '~/components/shared/EmptyState';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { useAuthStore } from '~/store/useAuthStore';
import type { ConversationStatus } from '~/types/conversation';
import { ASSIGNEE_DROP_PREFIX, AssigneeAvatar } from './components/AssigneeAvatar';
import { ConversationList } from './components/ConversationList';
import { ContextPanel } from './components/ContextPanel';
import { MessageThread } from './components/MessageThread';

export default function InboxPage() {
  const { t } = useTranslation('inbox');
  const { can } = useCan();
  const canAssign = can(Permissions.Inbox.Assign);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

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

  // Non-admin users can't call GET /channels (gated on channels.manage), so
  // the channel filter's options come from what's actually visible in the
  // conversation data itself, not a separate channels fetch.
  const { data: firstPage } = useQuery({
    queryKey: ['conversations', 'channel-options'],
    queryFn: () => conversationsApi.list({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const channelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of firstPage?.items ?? []) seen.set(item.channelId, item.channelName);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [firstPage]);

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
        {canAssign && assigneeOptions.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-muted-foreground text-2xs">{t('assignee')}:</span>
            <div className="flex gap-1.5">
              {assigneeOptions.map((member) => (
                <AssigneeAvatar key={member.userId} member={member} />
              ))}
            </div>
          </div>
        )}

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
