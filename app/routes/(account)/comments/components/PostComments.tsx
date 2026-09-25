import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { customerCommentKeys, customerCommentsApi } from '~/api/customerComments';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import type { CustomerCommentPost } from '~/types/customerComments';
import { buildThreads, type CommentFilter, filterThreads } from '../threads';
import { CommentItem } from './CommentItem';

const FILTERS: CommentFilter[] = ['all', 'new', 'unanswered', 'hidden'];

interface PostCommentsProps {
  channelId: string;
  post: CustomerCommentPost;
  canAct: boolean;
  onBack?: () => void;
}

export function PostComments({ channelId, post, canAct, onBack }: PostCommentsProps) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<CommentFilter>('all');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: customerCommentKeys.list(channelId, post.mediaId),
    queryFn: () => customerCommentsApi.list(channelId, post.mediaId),
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: customerCommentKeys.all });

  // Plain calls rather than useMutation: a mutation started from an effect loses its observer when
  // StrictMode re-runs the effect, and its isPending never clears (the button stayed disabled).
  // A failure has already been shown by the API client.
  const [syncing, setSyncing] = useState(false);
  const sync = () => {
    setSyncing(true);
    customerCommentsApi
      .sync(channelId, post.mediaId)
      .catch(() => undefined)
      .finally(() => {
        setSyncing(false);
        refresh();
      });
  };

  // Opening a post: bring in older comments once (the server allows it every 5 minutes per post)
  // and read what is new. Only with a plan — syncing is an action.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (openedFor.current === post.mediaId) return;
    openedFor.current = post.mediaId;
    if (canAct) sync();
    if (post.newCount > 0) customerCommentsApi.markRead(channelId, post.mediaId).then(refresh, () => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.mediaId]);

  const threads = filterThreads(buildThreads(comments), filter);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b p-3">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('comments.back')}
            onClick={onBack}
            className="-ml-1 shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
        )}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-14 shrink-0 rounded-md object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm">{post.caption || t('comments.noCaption')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs hover:underline">
                <ExternalLink className="size-3" />
                {t('comments.openInInstagram')}
              </a>
            )}
            {canAct && (
              <button
                type="button"
                disabled={syncing}
                onClick={sync}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs hover:underline disabled:opacity-50">
                <RefreshCw className={cn('size-3', syncing && 'animate-spin')} />
                {t('comments.sync')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b px-3 py-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium',
              filter === f ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
            {t(`comments.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto p-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
        ) : threads.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {filter === 'all' ? t('comments.noComments') : t('comments.noneForFilter')}
          </p>
        ) : (
          threads.map((thread) => (
            <div key={thread.comment.id} className="space-y-2">
              <CommentItem comment={thread.comment} canAct={canAct} />
              {thread.replies.map((reply) => (
                <div key={reply.id} className="ml-6">
                  <CommentItem comment={reply} canAct={canAct} isReply />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
