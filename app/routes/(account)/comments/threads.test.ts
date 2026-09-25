import { describe, expect, it } from 'vitest';
import type { CustomerComment } from '~/types/customerComments';
import { buildThreads, filterThreads } from './threads';

function comment(id: string, overrides: Partial<CustomerComment> = {}): CustomerComment {
  return {
    id,
    parentId: null,
    authorUsername: 'fan',
    isOwn: false,
    postedByAutomation: false,
    text: id,
    commentedAt: '2026-09-25T10:00:00Z',
    isHidden: false,
    isRead: true,
    directSent: false,
    canSendDirect: false,
    directAvailableUntil: '2026-10-02T10:00:00Z',
    autoReplyError: null,
    ...overrides,
  };
}

describe('buildThreads', () => {
  it('puts top-level comments newest first and their replies oldest first', () => {
    const threads = buildThreads([
      comment('old', { commentedAt: '2026-09-25T09:00:00Z' }),
      comment('r2', { parentId: 'old', commentedAt: '2026-09-25T09:30:00Z' }),
      comment('new', { commentedAt: '2026-09-25T11:00:00Z' }),
      comment('r1', { parentId: 'old', commentedAt: '2026-09-25T09:10:00Z' }),
    ]);

    expect(threads.map((t) => t.comment.id)).toEqual(['new', 'old']);
    expect(threads[1].replies.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(threads[0].replies).toEqual([]);
  });

  it('shows a reply whose parent is not stored as a thread of its own', () => {
    const threads = buildThreads([comment('orphan', { parentId: 'not-synced' })]);
    expect(threads.map((t) => t.comment.id)).toEqual(['orphan']);
  });
});

describe('filterThreads', () => {
  const threads = buildThreads([
    comment('unread', { isRead: false, commentedAt: '2026-09-25T10:05:00Z' }),
    comment('answered', { commentedAt: '2026-09-25T10:04:00Z' }),
    comment('reply', { parentId: 'answered', isOwn: true }),
    comment('directed', { directSent: true, commentedAt: '2026-09-25T10:03:00Z' }),
    comment('hidden', { isHidden: true, commentedAt: '2026-09-25T10:02:00Z' }),
    comment('fan-reply-only', { commentedAt: '2026-09-25T10:01:00Z' }),
    comment('fan-reply', { parentId: 'fan-reply-only', isRead: false }),
  ]);
  const ids = (filter: Parameters<typeof filterThreads>[1]) => filterThreads(threads, filter).map((t) => t.comment.id);

  it('"all" keeps everything', () => {
    expect(ids('all')).toHaveLength(5);
  });

  it('"new" finds an unread comment anywhere in the thread', () => {
    expect(ids('new')).toEqual(['unread', 'fan-reply-only']);
  });

  it('"unanswered" counts a public reply or the Direct message as an answer — a fan reply is not', () => {
    expect(ids('unanswered')).toEqual(['unread', 'hidden', 'fan-reply-only']);
  });

  it('"hidden" shows hidden comments', () => {
    expect(ids('hidden')).toEqual(['hidden']);
  });

  it('never counts the account’s own unread-looking comment as new', () => {
    const own = buildThreads([comment('mine', { isOwn: true, isRead: false })]);
    expect(filterThreads(own, 'new')).toEqual([]);
  });
});
