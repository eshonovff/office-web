import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Image as ImageIcon, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { customerCommentKeys, customerCommentsApi } from '~/api/customerComments';
import { customerChannelsApi } from '~/api/customerFlows';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button, buttonVariants } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useIsMobile } from '~/hooks/use-mobile';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import { CUSTOMER_CHANNELS_QUERY_KEY } from '~/routes/(account)/settings/useInstagramConnect';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { CustomerCommentPost } from '~/types/customerComments';
import { AutoReplyRules } from './components/AutoReplyRules';
import { PostComments } from './components/PostComments';

type CommentsTab = 'comments' | 'auto';

// A мизоҷ's Instagram comments, per post, and their comment auto-reply (the "auto" tab). Access is
// the (account) layout's мизоҷ session; every call goes to /api/public, where the tenant filter
// shows only this мизоҷ's data. Reading is free; acting (reply, Direct, hide, delete, sync, a new
// rule) needs a plan — the server refuses otherwise, and this page only offers what may be done.
export default function CommentsPage() {
  const { t } = useTranslation('customerAuth');
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const access = useCustomerAuthStore((s) => s.customer?.access);
  const hasPlan = access?.hasAccess ?? false;

  const { data: channels } = useQuery({ queryKey: CUSTOMER_CHANNELS_QUERY_KEY, queryFn: customerChannelsApi.list });
  const instagram = channels?.filter((c) => c.type === 'Instagram' && c.isActive) ?? [];
  // Only one of this мизоҷ's own channels is ever used — an id typed into the URL is ignored.
  const channel = instagram.find((c) => c.id === searchParams.get('channel')) ?? instagram[0] ?? null;
  const channelId = channel?.id ?? null;
  const canAct = hasPlan && !!channel && !channel.requiresReconnect;
  const selectedMediaId = searchParams.get('post');
  const tab: CommentsTab = searchParams.get('tab') === 'auto' ? 'auto' : 'comments';
  const tabParam: Record<string, string> = tab === 'auto' ? { tab: 'auto' } : {};

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: customerCommentKeys.posts(channelId ?? ''),
    queryFn: ({ pageParam }) => customerCommentsApi.posts(channelId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Posts come from Instagram — not asked for while the auto-reply tab is open.
    enabled: tab === 'comments' && !!channelId && !channel?.requiresReconnect,
  });
  const posts = data?.pages.flatMap((p) => p.items) ?? [];
  const selected = posts.find((p) => p.mediaId === selectedMediaId) ?? null;

  const open = (post: CustomerCommentPost | null) =>
    setSearchParams(
      { ...(channelId ? { channel: channelId } : {}), ...(post ? { post: post.mediaId } : {}) },
      { replace: !isMobile }
    );

  if (channels && instagram.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <MessageCircle className="text-muted-foreground size-8" />
        <p className="text-muted-foreground max-w-sm text-sm">{t('comments.noInstagram')}</p>
        <Link to="/account/automations" className={buttonVariants()}>
          {t('comments.connectInstagram')}
        </Link>
      </div>
    );
  }

  const notices = (
    <>
      {!hasPlan && (
        <p className="bg-muted/60 border-b px-3 py-2 text-xs">
          {t('comments.readOnlyPlan')}{' '}
          <Link to="/account/billing" className="text-primary hover:underline">
            {t('comments.choosePlan')}
          </Link>
        </p>
      )}
      {channel?.requiresReconnect && (
        <p className="bg-muted/60 border-b px-3 py-2 text-xs">
          {t('comments.reconnect')}{' '}
          <Link to="/account/automations" className="text-primary hover:underline">
            {t('comments.reconnectAction')}
          </Link>
        </p>
      )}
    </>
  );

  const postList = (
    <div className="flex h-full min-h-0 flex-col">
      {instagram.length > 1 && (
        <div className="border-b p-3">
          <CustomSelect
            options={instagram.map((c) => ({ value: c.id, label: c.name }))}
            value={channelId ?? undefined}
            onChange={(v) => v && setSearchParams({ channel: String(v), ...tabParam })}
          />
        </div>
      )}
      {notices}
      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-muted-foreground p-6 text-center text-sm">{t('comments.postsFailed')}</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">{t('comments.noPosts')}</p>
        ) : (
          <ul>
            {posts.map((post) => (
              <li key={post.mediaId}>
                <button
                  type="button"
                  onClick={() => open(post)}
                  aria-current={post.mediaId === selectedMediaId ? 'true' : undefined}
                  className={cn(
                    'hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2.5 text-left',
                    post.mediaId === selectedMediaId && 'bg-muted'
                  )}>
                  <span className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
                    {post.imageUrl ? (
                      <img src={post.imageUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                    ) : (
                      <ImageIcon className="text-muted-foreground size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm">{post.caption || t('comments.noCaption')}</span>
                    <span className="text-muted-foreground mt-0.5 block text-[11px]">
                      {post.timestamp && formatDate(post.timestamp)} ·{' '}
                      {t('comments.count', { count: post.commentCount })}
                    </span>
                  </span>
                  {post.newCount > 0 && (
                    <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-1.5 text-[11px] leading-5 tabular-nums">
                      {post.newCount}
                    </span>
                  )}
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
                  {t('comments.morePosts')}
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );

  const tabs = (
    <div role="tablist" aria-label={t('comments.tabs.label')} className="flex gap-1">
      {(['comments', 'auto'] as const).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() =>
            setSearchParams({
              ...(channelId ? { channel: channelId } : {}),
              ...(key === 'auto' ? { tab: 'auto' } : {}),
            })
          }
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium',
            tab === key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}>
          {key === 'auto' ? t('comments.tabs.autoReply') : t('comments.tabs.comments')}
        </button>
      ))}
    </div>
  );

  const autoReply = (
    <div className="flex h-full min-h-0 flex-col">
      {instagram.length > 1 && (
        <div className="border-b p-3">
          <CustomSelect
            options={instagram.map((c) => ({ value: c.id, label: c.name }))}
            value={channelId ?? undefined}
            onChange={(v) => v && setSearchParams({ channel: String(v), tab: 'auto' })}
          />
        </div>
      )}
      {notices}
      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto">
        {channelId && <AutoReplyRules key={channelId} channelId={channelId} hasPlan={hasPlan} />}
      </div>
    </div>
  );

  if (isMobile) {
    if (tab === 'comments' && selected && channelId) {
      return (
        <div className="bg-background -m-3 h-[calc(100%+1.5rem)]">
          <PostComments
            key={selected.mediaId}
            channelId={channelId}
            post={selected}
            canAct={canAct}
            onBack={() => open(null)}
          />
        </div>
      );
    }
    return (
      <div className="bg-background -m-3 flex h-[calc(100%+1.5rem)] flex-col">
        <div className="border-b p-2">{tabs}</div>
        <div className="min-h-0 flex-1">{tab === 'auto' ? autoReply : postList}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {tabs}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border">
        {tab === 'auto' ? (
          <div className="min-w-0 flex-1">{autoReply}</div>
        ) : (
          <>
            <div className="w-80 shrink-0 border-r lg:w-96">{postList}</div>
            <div className="min-w-0 flex-1">
              {selected && channelId ? (
                <PostComments key={selected.mediaId} channelId={channelId} post={selected} canAct={canAct} />
              ) : (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm">
                  <MessageCircle className="size-8" />
                  {t('comments.pickPost')}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
