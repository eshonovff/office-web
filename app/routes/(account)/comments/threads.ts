import type { CustomerComment } from '~/types/customerComments';

export type CommentFilter = 'all' | 'new' | 'unanswered' | 'hidden';

export interface CommentThread {
  comment: CustomerComment;
  replies: CustomerComment[];
}

/**
 * Top-level comments newest first, each with its replies oldest first (Instagram's own order).
 * A reply whose parent is not stored (older than the sync reached) is shown as a thread of its own.
 */
export function buildThreads(comments: CustomerComment[]): CommentThread[] {
  const ids = new Set(comments.map((c) => c.id));
  const repliesByParent = new Map<string, CustomerComment[]>();
  const tops: CustomerComment[] = [];

  for (const c of comments) {
    if (c.parentId && ids.has(c.parentId)) {
      const list = repliesByParent.get(c.parentId) ?? [];
      list.push(c);
      repliesByParent.set(c.parentId, list);
    } else {
      tops.push(c);
    }
  }

  const byTime = (a: CustomerComment, b: CustomerComment) => a.commentedAt.localeCompare(b.commentedAt);
  return tops
    .sort((a, b) => byTime(b, a))
    .map((comment) => ({ comment, replies: (repliesByParent.get(comment.id) ?? []).sort(byTime) }));
}

export function filterThreads(threads: CommentThread[], filter: CommentFilter): CommentThread[] {
  switch (filter) {
    case 'new':
      return threads.filter((t) => [t.comment, ...t.replies].some((c) => !c.isOwn && !c.isRead));
    case 'unanswered':
      // Answered = a public reply from the account, or the one Direct message.
      return threads.filter((t) => !t.comment.isOwn && !t.comment.directSent && !t.replies.some((r) => r.isOwn));
    case 'hidden':
      return threads.filter((t) => [t.comment, ...t.replies].some((c) => c.isHidden));
    default:
      return threads;
  }
}
