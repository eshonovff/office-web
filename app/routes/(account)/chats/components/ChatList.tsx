import { useInfiniteQuery } from '@tanstack/react-query';
import { MessageSquare, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { customerChatKeys, customerChatsApi } from '~/api/customerChats';
import { ChannelLogo } from '~/components/shared/ChannelLogo';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { formatRelativeTime } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { CustomerChatListItem } from '~/types/customerChats';
import { contactTitle } from '../contactTitle';
import { ContactAvatar } from './ContactAvatar';

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

function Preview({ chat }: { chat: CustomerChatListItem }) {
  const { t } = useTranslation('customerAuth');
  const last = chat.lastMessage;
  if (!last) return null;
  const text = last.type === 'Text' && last.body ? last.body : t(`chats.type.${last.type}`);
  return (
    <p
      className={cn(
        'truncate text-xs',
        chat.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
      )}>
      {last.direction === 'Outbound' && `${t('chats.you')}: `}
      {text}
    </p>
  );
}

interface ChatListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ChatList({ selectedId, onSelect }: ChatListProps) {
  const { t } = useTranslation('customerAuth');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = { search: search || undefined, unreadOnly: unreadOnly || undefined };
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: customerChatKeys.list(params),
    queryFn: ({ pageParam }) => customerChatsApi.list({ ...params, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined),
  });
  const chats = data?.pages.flatMap((page) => page.items) ?? [];
  const filtering = Boolean(search) || unreadOnly;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('chats.search')}
            aria-label={t('chats.search')}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={unreadOnly ? 'outline' : 'secondary'}
            className="h-7"
            onClick={() => setUnreadOnly(false)}>
            {t('chats.filterAll')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={unreadOnly ? 'secondary' : 'outline'}
            className="h-7"
            onClick={() => setUnreadOnly(true)}>
            {t('chats.filterUnread')}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <MessageSquare className="text-muted-foreground size-8" />
            <p className="text-muted-foreground text-sm">{filtering ? t('chats.noMatches') : t('chats.empty')}</p>
            {!filtering && (
              <Link to="/account/automations" className="text-primary text-sm hover:underline">
                {t('chats.connectInstagram')}
              </Link>
            )}
          </div>
        ) : (
          <ul>
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  aria-current={chat.id === selectedId ? 'true' : undefined}
                  className={cn(
                    'hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    chat.id === selectedId && 'bg-muted'
                  )}>
                  <span className="relative shrink-0">
                    <ContactAvatar name={contactTitle(chat, '?')} url={chat.contactAvatarUrl} />
                    <ChannelLogo
                      type={chat.channelType}
                      label={chat.channelType}
                      className="ring-background absolute -right-0.5 -bottom-0.5 size-4 rounded-full ring-2"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{contactTitle(chat, t('chats.unknownContact'))}</p>
                      {chat.lastMessageAt && (
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {formatRelativeTime(chat.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Preview chat={chat} />
                      {chat.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-1.5 text-[11px] leading-5 tabular-nums">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {hasNextPage && (
              <li className="flex justify-center p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}>
                  {t('chats.loadMore')}
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
