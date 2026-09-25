import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { customerChatKeys, customerChatsApi } from '~/api/customerChats';
import { ChannelLogo } from '~/components/shared/ChannelLogo';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { formatWindowRemaining } from '~/lib/format';
import { MessageBubble } from '~/routes/(app)/inbox/components/MessageBubble';
import { isScrolledNearBottom } from '~/routes/(app)/inbox/components/MessageThread';
import { InboxApiProvider } from '~/routes/(app)/inbox/inboxApi';
import { revokeMessageBlobCache } from '~/routes/(app)/inbox/useMessageBlobUrl';
import { customerInboxApi } from '../customerInboxApi';
import { ChatComposer } from './ChatComposer';
import { contactTitle } from '../contactTitle';
import { ContactAvatar } from './ContactAvatar';

const PAGE_SIZE = 30;

interface ChatThreadProps {
  conversationId: string;
  /** Phone only, where the thread replaces the list on screen. */
  onBack?: () => void;
}

export function ChatThread({ conversationId, onBack }: ChatThreadProps) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  const { data: chat } = useQuery({
    queryKey: customerChatKeys.detail(conversationId),
    queryFn: () => customerChatsApi.get(conversationId),
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: customerChatKeys.messages(conversationId),
    queryFn: ({ pageParam }) => customerChatsApi.listMessages(conversationId, { page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined),
  });
  // Newest-first from the server; the thread reads top to bottom.
  const messages = (data?.pages.flatMap((page) => page.items) ?? []).slice().reverse();

  const { mutate: markAsRead } = useMutation({
    mutationFn: () => customerChatsApi.markAsRead(conversationId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerChatKeys.all }),
  });

  // Opening a chat reads it — and so does a new message arriving while it is open.
  const unread = chat?.unreadCount ?? 0;
  useEffect(() => {
    if (unread > 0) markAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, unread]);

  useEffect(() => {
    if (messages.length === 0) return;
    const container = scrollRef.current;
    const freshOpen = scrolledFor.current !== conversationId;
    const nearBottom =
      !container || isScrolledNearBottom(container.scrollHeight, container.scrollTop, container.clientHeight);
    if (freshOpen || nearBottom) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
      scrolledFor.current = conversationId;
    }
  }, [messages.length, conversationId]);

  useEffect(() => revokeMessageBlobCache, []);

  const windowLeft = chat ? formatWindowRemaining(chat.windowExpiresAt) : null;

  return (
    <InboxApiProvider value={customerInboxApi}>
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('chats.back')}
              onClick={onBack}
              className="-ml-1 shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          )}
          {chat ? (
            <>
              <ContactAvatar name={contactTitle(chat, '?')} url={chat.contactAvatarUrl} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{contactTitle(chat, t('chats.unknownContact'))}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {chat.contactUsername && (
                    <a
                      href={`https://instagram.com/${encodeURIComponent(chat.contactUsername)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground inline-flex items-center gap-0.5 hover:underline">
                      @{chat.contactUsername}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                  {chat.contactUsername && ' · '}
                  <ChannelLogo type={chat.channelType} className="mr-1 inline-block size-3 align-[-2px]" />
                  {chat.channelName}
                </p>
              </div>
              <Badge variant={windowLeft ? 'outline' : 'secondary'} className="shrink-0 text-[11px]">
                {windowLeft ?? t('chats.windowClosed')}
              </Badge>
            </>
          ) : (
            <Skeleton className="h-8 w-48" />
          )}
        </div>

        <div ref={scrollRef} className="min-w-0 flex-1 scrollbar-thin space-y-2 overflow-x-hidden overflow-y-auto p-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-2/3 rounded-lg" />
              ))}
            </div>
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
                    {t('chats.loadOlder')}
                  </Button>
                </div>
              )}
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} channelType={chat?.channelType} showSender={false} />
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {chat && <ChatComposer chat={chat} />}
      </div>
    </InboxApiProvider>
  );
}
