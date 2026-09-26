import { useInfiniteQuery } from '@tanstack/react-query';
import { ExternalLink, ImageIcon, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { customerCommentKeys, customerCommentsApi } from '~/api/customerComments';
import { formatDate } from '~/lib/format';
import type { AnalyticsTopPost } from '~/types/customerAnalytics';
import type { CustomerChannel } from '~/types/customerChannels';
import type { CustomerCommentPost } from '~/types/customerComments';
import { safeImageSrc, safeInstagramLink } from '../analytics';

export function TopPostsSection({ posts, channels }: { posts: AnalyticsTopPost[]; channels: CustomerChannel[] }) {
  const { t } = useTranslation('customerAuth');

  return (
    <section className="bg-card min-w-0 rounded-xl border">
      <header className="border-b p-4">
        <h2 className="text-sm font-semibold">{t('analytics.posts.title')}</h2>
        <p className="text-muted-foreground text-xs">{t('analytics.posts.subtitle')}</p>
      </header>
      {posts.length === 0 ? (
        <p className="text-muted-foreground p-6 text-center text-sm">{t('analytics.posts.empty')}</p>
      ) : (
        <ul className="divide-y">
          {posts.map((post) => (
            <li key={`${post.channelId}:${post.mediaId}`}>
              <PostRow post={post} channel={channels.find((c) => c.id === post.channelId)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PostRow({ post, channel }: { post: AnalyticsTopPost; channel: CustomerChannel | undefined }) {
  const { t } = useTranslation('customerAuth');
  const preview = usePostPreview(channel, post.mediaId);
  const image = safeImageSrc(preview?.imageUrl);
  const instagramLink = safeInstagramLink(preview?.permalink);
  const commentsLink = `/account/comments?${new URLSearchParams({ channel: post.channelId, post: post.mediaId })}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {image ? (
        <img src={image} alt="" referrerPolicy="no-referrer" className="size-12 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-md">
          <ImageIcon className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {preview?.caption ||
            (preview?.timestamp
              ? t('analytics.posts.postFrom', { date: formatDate(preview.timestamp) })
              : t('analytics.posts.post'))}
        </p>
        <p className="text-muted-foreground text-2xs tabular-nums">
          {t('analytics.posts.comments', { count: post.comments })}
          {' · '}
          {t('analytics.posts.autoReplied', { count: post.autoReplied })}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-3">
          {preview && (
            <Link to={commentsLink} className="text-primary inline-flex items-center gap-1 text-xs hover:underline">
              <MessageCircle className="size-3" />
              {t('analytics.posts.openComments')}
            </Link>
          )}
          {instagramLink && (
            <a
              href={instagramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs hover:underline">
              <ExternalLink className="size-3" />
              {t('analytics.posts.openInstagram')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// The picture and link come from the Comments page's own list of posts (same query key and pages),
// so one request to Instagram serves both pages. A post not among the recent ones shows no picture —
// the Comments page could not open it either. Never asked for an account that can't answer.
function usePostPreview(channel: CustomerChannel | undefined, mediaId: string): CustomerCommentPost | null {
  const channelId = channel?.id ?? '';
  const { data } = useInfiniteQuery({
    queryKey: customerCommentKeys.posts(channelId),
    queryFn: ({ pageParam }) => customerCommentsApi.posts(channelId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!channel && channel.type === 'Instagram' && channel.isActive && !channel.requiresReconnect,
    staleTime: 5 * 60_000,
  });
  return data?.pages.flatMap((page) => page.items).find((item) => item.mediaId === mediaId) ?? null;
}
