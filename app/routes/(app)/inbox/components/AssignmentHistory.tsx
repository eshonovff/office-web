import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { conversationsApi } from '~/api/conversations';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Skeleton } from '~/components/ui/skeleton';
import { formatRelativeTime } from '~/lib/format';

const PAGE_SIZE = 10;

interface AssignmentHistoryProps {
  conversationId: string;
}

/**
 * GET /conversations/{id}/assignment-history — newest-first, same
 * page/pageSize shape as /{id}/messages. fromUserId/toUserId can each be
 * null at the edges (ClaimedOnReply has no `from`, AutoReleased has no
 * `to`) — rendered as `unassigned` rather than left blank.
 *
 * The endpoint 404s both when the conversation truly doesn't exist and
 * when IChannelAccessGuard denies access (ConversationsEndpoints.cs
 * deliberately doesn't distinguish the two, to avoid leaking existence to a
 * caller who lacks access). Either way there's nothing meaningful to show,
 * and treating it as a loud error would be misleading — so on any query
 * error the whole section just disappears instead of showing an empty or
 * error state.
 */
export function AssignmentHistory({ conversationId }: AssignmentHistoryProps) {
  const { t } = useTranslation('inbox');

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['conversations', conversationId, 'assignment-history'],
    queryFn: ({ pageParam }) =>
      conversationsApi.listAssignmentHistory(conversationId, { page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.totalCount ? lastPage.page + 1 : undefined,
  });

  if (isError) return null;

  const events = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground text-2xs">{t('assignmentHistory')}</Label>

      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-2xs">{t('assignmentHistoryEmpty')}</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((event) => (
            <div key={event.id} className="space-y-0.5 rounded-md border p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-2xs font-medium">
                  {event.fromUserName ?? t('unassigned')} → {event.toUserName ?? t('unassigned')}
                </span>
                <Badge variant="outline" className="shrink-0 text-2xs">
                  {t(`assignmentReason.${event.reason}`)}
                </Badge>
              </div>
              <p className="text-muted-foreground text-2xs">{formatRelativeTime(event.createdAt)}</p>
            </div>
          ))}
          {hasNextPage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}>
              {t('assignmentHistoryLoadOlder')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
