import { useInfiniteQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { conversationsApi } from '~/api/conversations';
import { EmptyState } from '~/components/shared/EmptyState';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import type { ConversationStatus } from '~/types/conversation';
import { useInboxStore } from '../store';
import { useInboxBreakpoint } from '../useInboxBreakpoint';
import { ConversationListItem } from './ConversationListItem';

const PAGE_SIZE = 20;
const STATUSES: ConversationStatus[] = ['New', 'InProgress', 'Waiting', 'Closed'];

interface ConversationListProps {
  channelOptions: { value: string; label: string }[];
  selectedId: string | null;
  draggable: boolean;
  onSelect: (id: string) => void;
}

export function ConversationList({ channelOptions, selectedId, draggable, onSelect }: ConversationListProps) {
  const { t } = useTranslation('inbox');
  const { channelId, status, setChannelId, setStatus } = useInboxStore();
  const breakpoint = useInboxBreakpoint();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = (channelId ? 1 : 0) + (status ? 1 : 0);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['conversations', { channelId, status }],
    queryFn: ({ pageParam }) =>
      conversationsApi.list({
        channelId: channelId ?? undefined,
        status: status ?? undefined,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page * lastPage.pageSize < lastPage.totalCount ? lastPage.page + 1 : undefined),
  });

  const conversations = data?.pages.flatMap((page) => page.items) ?? [];

  const statusOptions = STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }));

  return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      {breakpoint === 'mobile' ? (
        <div className="p-2 pb-0">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setFiltersOpen(true)}>
            <Filter className="h-3.5 w-3.5" />
            {t('filters')}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 justify-center px-1 text-2xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>{t('filters')}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 p-4 pt-0">
                <CustomSelect
                  options={channelOptions}
                  value={channelId}
                  onChange={(value) => setChannelId((value as string) ?? null)}
                  isClearable
                  placeholder={t('allChannels')}
                />
                <CustomSelect
                  options={statusOptions}
                  value={status}
                  onChange={(value) => setStatus((value as ConversationStatus) ?? null)}
                  isClearable
                  placeholder={t('allStatuses')}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="flex gap-2 p-2 pb-0">
          <CustomSelect
            options={channelOptions}
            value={channelId}
            onChange={(value) => setChannelId((value as string) ?? null)}
            isClearable
            placeholder={t('allChannels')}
            className="min-w-0 flex-1"
          />
          <CustomSelect
            options={statusOptions}
            value={status}
            onChange={(value) => setStatus((value as ConversationStatus) ?? null)}
            isClearable
            placeholder={t('allStatuses')}
            className="min-w-0 flex-1"
          />
        </div>
      )}

      <div className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
        ) : conversations.length === 0 ? (
          <EmptyState message={t('noConversations')} />
        ) : (
          <>
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === selectedId}
                draggable={draggable}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
            {hasNextPage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}>
                {t('loadMore')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
