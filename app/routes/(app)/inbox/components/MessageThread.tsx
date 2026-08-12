import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { conversationsApi } from '~/api/conversations';
import { EmptyState } from '~/components/shared/EmptyState';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import type { ConversationDetail } from '~/types/conversation';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';
import { revokeMessageBlobCache } from '../useMessageBlobUrl';

const PAGE_SIZE = 30;

interface MessageThreadProps {
  conversationId: string;
  conversation: ConversationDetail | null;
  /** Shown as a back arrow — mobile only, where the thread replaces the list on screen. */
  onBack?: () => void;
  /** Shown as an info button — mobile/tablet only, where ContextPanel isn't a permanent column. */
  onOpenInfo?: () => void;
}

export function MessageThread({ conversationId, conversation, onBack, onOpenInfo }: MessageThreadProps) {
  const { t } = useTranslation('inbox');
  const { can } = useCan();
  const canReply = can(Permissions.Inbox.Reply);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: ({ pageParam }) =>
      conversationsApi.listMessages(conversationId, { page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.totalCount ? lastPage.page + 1 : undefined,
  });

  // Backend returns newest-first (for cheap "first page = latest" fetching);
  // the thread reads top-to-bottom chronologically, so reverse for display.
  const messages = (data?.pages.flatMap((page) => page.items) ?? []).slice().reverse();

  const { mutate: markAsRead } = useMutation({
    mutationFn: () => conversationsApi.markAsRead(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] });
      // Also clears the unread badge in the list pane, whatever filters it's under.
      void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
    },
  });

  useEffect(() => {
    markAsRead();
    // Fires once per opened conversation, not on every render — `markAsRead`
    // (a useMutation callback) is intentionally left out of the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  useEffect(() => revokeMessageBlobCache, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        {onBack && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('back')} onClick={onBack} className="-ml-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          {conversation ? (
            <>
              <span className="truncate text-sm font-semibold">{conversation.contactName || conversation.externalId}</span>
              <Badge variant="outline" className="text-2xs shrink-0">
                {t(`status.${conversation.status}`)}
              </Badge>
            </>
          ) : (
            <Skeleton className="h-5 w-40" />
          )}
        </div>
        {onOpenInfo && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('conversationInfo')} onClick={onOpenInfo} className="shrink-0">
            <Info className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-2/3 rounded-lg" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState message={t('noMessages')} />
        ) : (
          <>
            {hasNextPage && (
              <div className="flex justify-center pb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}>
                  {t('loadOlder')}
                </Button>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {canReply && conversation && <Composer conversation={conversation} />}
    </div>
  );
}
