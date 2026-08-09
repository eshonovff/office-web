import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { conversationsApi } from '~/api/conversations';
import { EmptyState } from '~/components/shared/EmptyState';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import type { ConversationDetail } from '~/types/conversation';
import { MessageBubble } from './MessageBubble';

const PAGE_SIZE = 30;

interface MessageThreadProps {
  conversationId: string;
  conversation: ConversationDetail | null;
}

export function MessageThread({ conversationId, conversation }: MessageThreadProps) {
  const { t } = useTranslation('inbox');
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        {conversation ? (
          <>
            <span className="text-sm font-semibold">{conversation.contactName || conversation.externalId}</span>
            <Badge variant="outline" className="text-2xs">
              {t(`status.${conversation.status}`)}
            </Badge>
          </>
        ) : (
          <Skeleton className="h-5 w-40" />
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
    </div>
  );
}
