import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commentAutomationApi } from '~/api/commentAutomation';
import { customerCommentRulesApi } from '~/api/customerCommentRules';
import { customerCommentsApi } from '~/api/customerComments';
import { customerChannelsApi } from '~/api/customerFlows';
import { useIsMobile } from '~/hooks/use-mobile';
import { makeQueryClient } from '~/lib/query-client';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { AutomationRuleListItem } from '~/types/commentAutomation';
import type { CustomerChannel } from '~/types/customerChannels';
import type { CustomerComment, CustomerCommentPost } from '~/types/customerComments';
import CommentsPage from './route';

vi.mock('~/api/customerComments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerComments')>()),
  customerCommentsApi: {
    posts: vi.fn(),
    list: vi.fn(),
    newCount: vi.fn(),
    markRead: vi.fn(),
    sync: vi.fn(),
    reply: vi.fn(),
    sendDirect: vi.fn(),
    setHidden: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('~/api/customerFlows', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerFlows')>()),
  customerChannelsApi: { list: vi.fn() },
}));
vi.mock('~/api/customerCommentRules', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerCommentRules')>()),
  customerCommentRulesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    remove: vi.fn(),
    dryRun: vi.fn(),
    listInstagramMedia: vi.fn(),
  },
}));
// The staff rules API must never be touched from the мизоҷ page — spied on to prove it.
vi.mock('~/api/commentAutomation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/commentAutomation')>()),
  commentAutomationApi: { dryRun: vi.fn(), update: vi.fn(), setActive: vi.fn(), remove: vi.fn(), list: vi.fn() },
}));
vi.mock('~/hooks/use-mobile', () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function channel(overrides: Partial<CustomerChannel> = {}): CustomerChannel {
  return {
    id: 'ch1',
    type: 'Instagram',
    name: 'my_shop',
    isActive: true,
    requiresReconnect: false,
    webhookSetupWarning: null,
    createdAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function post(overrides: Partial<CustomerCommentPost> = {}): CustomerCommentPost {
  return {
    mediaId: '1790001',
    mediaType: 'IMAGE',
    imageUrl: null,
    permalink: 'https://www.instagram.com/p/abc/',
    caption: 'Коллексияи нав',
    timestamp: '2026-09-24T10:00:00Z',
    commentCount: 2,
    newCount: 1,
    ...overrides,
  };
}

function comment(overrides: Partial<CustomerComment> = {}): CustomerComment {
  return {
    id: 'k1',
    parentId: null,
    authorUsername: 'nilufar',
    isOwn: false,
    postedByAutomation: false,
    text: 'Нархаш чанд?',
    commentedAt: new Date().toISOString(),
    isHidden: false,
    isRead: false,
    directSent: false,
    canSendDirect: true,
    directAvailableUntil: new Date(Date.now() + 6 * 86_400_000).toISOString(),
    autoReplyError: null,
    ...overrides,
  };
}

function signIn(hasAccess: boolean) {
  useCustomerAuthStore.setState({
    accessToken: 'token',
    customer: {
      id: 'cu1',
      email: 'shop@example.com',
      fullName: 'Shop',
      avatarUrl: null,
      emailVerified: true,
      access: { status: hasAccess ? 'Active' : 'Expired', tier: null, endsAt: null, hasAccess },
    },
  });
}

// StrictMode, as in dev: it mounts effects twice, which is how a mutation started from an effect
// once lost its observer and left the sync button disabled for good.
function renderPage(path = '/account/comments') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={makeQueryClient()}>
          <CommentsPage />
        </QueryClientProvider>
      </MemoryRouter>
    </StrictMode>
  );
}

async function openPost() {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole('button', { name: /Коллексияи нав/ }));
  await screen.findByText('Нархаш чанд?');
  return user;
}

describe('CommentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    signIn(true);
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel()]);
    vi.mocked(customerCommentsApi.posts).mockResolvedValue({ items: [post()], nextCursor: null });
    vi.mocked(customerCommentsApi.list).mockResolvedValue([comment()]);
    vi.mocked(customerCommentsApi.sync).mockResolvedValue({ added: 0, throttled: false });
    vi.mocked(customerCommentsApi.markRead).mockResolvedValue();
    vi.mocked(customerCommentsApi.reply).mockResolvedValue();
    vi.mocked(customerCommentsApi.sendDirect).mockResolvedValue();
    vi.mocked(customerCommentsApi.setHidden).mockResolvedValue();
    vi.mocked(customerCommentsApi.remove).mockResolvedValue();
  });

  it('with no Instagram connected, points to connecting it — and asks nothing of the comments API', async () => {
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel({ type: 'WhatsApp' })]);
    renderPage();

    expect(await screen.findByRole('link', { name: 'comments.connectInstagram' })).toHaveAttribute(
      'href',
      '/account/automations'
    );
    expect(customerCommentsApi.posts).not.toHaveBeenCalled();
  });

  it('lists the posts with their new-comment count', async () => {
    renderPage();

    const item = await screen.findByRole('button', { name: /Коллексияи нав/ });
    expect(within(item).getByText('1')).toBeInTheDocument();
    expect(customerCommentsApi.posts).toHaveBeenCalledWith('ch1', undefined);
  });

  it('ignores a channel id in the URL that is not one of the мизоҷ’s own', async () => {
    renderPage('/account/comments?channel=someone-elses');

    await screen.findByRole('button', { name: /Коллексияи нав/ });
    expect(customerCommentsApi.posts).toHaveBeenCalledWith('ch1', undefined);
    expect(customerCommentsApi.posts).not.toHaveBeenCalledWith('someone-elses', expect.anything());
  });

  it('opening a post loads its comments, brings in older ones and reads the new', async () => {
    await openPost();

    expect(customerCommentsApi.list).toHaveBeenCalledWith('ch1', '1790001');
    await waitFor(() => expect(customerCommentsApi.sync).toHaveBeenCalledWith('ch1', '1790001'));
    expect(customerCommentsApi.markRead).toHaveBeenCalledWith('ch1', '1790001');
    expect(screen.getByRole('link', { name: '@nilufar' })).toHaveAttribute('href', 'https://instagram.com/nilufar');
  });

  it('the sync button is usable again once the sync on opening has finished — even if it failed', async () => {
    vi.mocked(customerCommentsApi.sync).mockRejectedValue(new Error('500'));
    await openPost();

    await waitFor(() => expect(customerCommentsApi.sync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'comments.sync' })).toBeEnabled());
  });

  it('replies under a comment with the trimmed text', async () => {
    const user = await openPost();

    await user.click(screen.getByRole('button', { name: 'comments.reply' }));
    await user.type(screen.getByRole('textbox', { name: 'comments.replyPlaceholder' }), '  Нархаш 120 сомонӣ {Enter}');

    await waitFor(() => expect(customerCommentsApi.reply).toHaveBeenCalledWith('k1', 'Нархаш 120 сомонӣ'));
  });

  it('sends the one Direct message through the dialog', async () => {
    const user = await openPost();

    await user.click(screen.getByRole('button', { name: 'comments.direct' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), ' Салом! ');
    await user.click(within(dialog).getByRole('button', { name: 'comments.send' }));

    await waitFor(() => expect(customerCommentsApi.sendDirect).toHaveBeenCalledWith('k1', 'Салом!'));
  });

  it('offers no Direct once it is sent or no longer allowed', async () => {
    vi.mocked(customerCommentsApi.list).mockResolvedValue([comment({ canSendDirect: false, directSent: true })]);
    await openPost();

    expect(screen.queryByRole('button', { name: 'comments.direct' })).not.toBeInTheDocument();
    expect(screen.getByText('comments.directSent')).toBeInTheDocument();
  });

  it('hides a fan’s comment', async () => {
    const user = await openPost();

    await user.click(screen.getByRole('button', { name: 'comments.hide' }));

    await waitFor(() => expect(customerCommentsApi.setHidden).toHaveBeenCalledWith('k1', true));
  });

  it('deletes only after confirming', async () => {
    const user = await openPost();

    await user.click(screen.getByRole('button', { name: 'comments.delete' }));
    expect(customerCommentsApi.remove).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'comments.delete' }));

    await waitFor(() => expect(customerCommentsApi.remove).toHaveBeenCalledWith('k1'));
  });

  it('never offers to hide or answer the account’s own reply', async () => {
    vi.mocked(customerCommentsApi.list).mockResolvedValue([
      comment(),
      comment({ id: 'k2', parentId: 'k1', isOwn: true, canSendDirect: false, text: 'Ташаккур!' }),
    ]);
    await openPost();

    expect(screen.getAllByRole('button', { name: 'comments.reply' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'comments.hide' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'comments.delete' })).toHaveLength(2);
  });

  it('without a plan the comments can be read, but nothing can be done', async () => {
    signIn(false);
    await openPost();

    expect(screen.getByRole('link', { name: 'comments.choosePlan' })).toHaveAttribute('href', '/account/billing');
    for (const action of ['reply', 'direct', 'hide', 'delete', 'sync']) {
      expect(screen.queryByRole('button', { name: `comments.${action}` })).not.toBeInTheDocument();
    }
    expect(customerCommentsApi.sync).not.toHaveBeenCalled();
  });

  it('with a channel to reconnect, says so and fetches no posts', async () => {
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel({ requiresReconnect: true })]);
    renderPage();

    expect(await screen.findByRole('link', { name: 'comments.reconnectAction' })).toBeInTheDocument();
    expect(customerCommentsApi.posts).not.toHaveBeenCalled();
  });

  it('on a phone shows the posts, then one post alone with a way back', async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    const user = await openPost();

    expect(screen.queryByRole('button', { name: /Коллексияи нав/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'comments.back' }));

    expect(await screen.findByRole('button', { name: /Коллексияи нав/ })).toBeInTheDocument();
  });
});

function rule(overrides: Partial<AutomationRuleListItem> = {}): AutomationRuleListItem {
  return {
    id: 'r1',
    name: 'Нарх',
    isActive: true,
    triggerType: 'instagram_comment',
    triggerConfig: { matchMode: 'keyword', keywords: ['нарх'], postScope: 'all', postIds: [] },
    conditionConfig: { requiresFollow: true },
    actionConfig: {
      onMatch: {
        commentReplies: ['Ба Direct навиштем 📩'],
        dmText: 'Нарх: 120 сомонӣ',
        dmButtonUrl: null,
        dmButtonTitle: null,
      },
      onNotFollowing: {
        commentReplies: ['Аввал обуна шавед 🙏'],
        dmText: 'Обуна шавед ва аз нав нависед',
        dmButtonUrl: null,
        dmButtonTitle: null,
      },
    },
    cooldownMinutes: 60,
    createdAt: '2026-09-25T10:00:00Z',
    runCount: 3,
    ...overrides,
  };
}

describe('CommentsPage — auto-reply tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    signIn(true);
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel()]);
    vi.mocked(customerCommentsApi.posts).mockResolvedValue({ items: [post()], nextCursor: null });
    vi.mocked(customerCommentRulesApi.list).mockResolvedValue([rule()]);
    vi.mocked(customerCommentRulesApi.setActive).mockResolvedValue();
    vi.mocked(customerCommentRulesApi.remove).mockResolvedValue();
    vi.mocked(customerCommentRulesApi.update).mockResolvedValue(rule());
    vi.mocked(customerCommentRulesApi.dryRun).mockResolvedValue({
      matched: true,
      matchedKeyword: 'нарх',
      followCheckResult: null,
    });
  });

  it('lists the rules of the мизоҷ’s channel — and asks Instagram for no posts meanwhile', async () => {
    renderPage('/account/comments?tab=auto');

    expect(await screen.findByText('Нарх')).toBeInTheDocument();
    expect(screen.getByText('comments.rules.followCheck')).toBeInTheDocument();
    expect(customerCommentRulesApi.list).toHaveBeenCalledWith('ch1');
    expect(customerCommentsApi.posts).not.toHaveBeenCalled();
  });

  it('is reached from the comments tab, on the same channel', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'comments.tabs.autoReply' }));

    expect(await screen.findByText('Нарх')).toBeInTheDocument();
    expect(customerCommentRulesApi.list).toHaveBeenCalledWith('ch1');
  });

  it('switches a rule off through the мизоҷ API', async () => {
    const user = userEvent.setup();
    renderPage('/account/comments?tab=auto');

    await user.click(await screen.findByRole('switch', { name: 'comments.rules.toggle' }));

    await waitFor(() => expect(customerCommentRulesApi.setActive).toHaveBeenCalledWith('ch1', 'r1', false));
    expect(commentAutomationApi.setActive).not.toHaveBeenCalled();
  });

  it('deletes a rule only after confirming', async () => {
    const user = userEvent.setup();
    renderPage('/account/comments?tab=auto');

    await user.click(await screen.findByRole('button', { name: 'actions.delete' }));
    expect(customerCommentRulesApi.remove).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'actions.delete' }));

    await waitFor(() => expect(customerCommentRulesApi.remove).toHaveBeenCalledWith('ch1', 'r1'));
  });

  it('edits a rule — its test run and its save go to the мизоҷ API, never the staff one', async () => {
    const user = userEvent.setup();
    renderPage('/account/comments?tab=auto');

    await user.click(await screen.findByRole('button', { name: 'actions.edit' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'dryRun.title' }));
    await user.type(within(dialog).getByPlaceholderText('dryRun.placeholder'), 'Нархаш чанд?');
    await user.click(within(dialog).getByText('dryRun.run'));
    await waitFor(() => expect(customerCommentRulesApi.dryRun).toHaveBeenCalledWith('ch1', expect.anything()));

    await user.click(screen.getByRole('button', { name: 'actions.save' }));

    await waitFor(() =>
      expect(customerCommentRulesApi.update).toHaveBeenCalledWith(
        'ch1',
        'r1',
        expect.objectContaining({
          name: 'Нарх',
          conditionConfig: { requiresFollow: true },
          actionConfig: expect.objectContaining({
            onNotFollowing: expect.objectContaining({ dmText: 'Обуна шавед ва аз нав нависед' }),
          }),
        })
      )
    );
    expect(commentAutomationApi.dryRun).not.toHaveBeenCalled();
    expect(commentAutomationApi.update).not.toHaveBeenCalled();
  });

  it('without a plan: no new rule, and a rule that is off stays off', async () => {
    signIn(false);
    vi.mocked(customerCommentRulesApi.list).mockResolvedValue([rule({ isActive: false })]);
    renderPage('/account/comments?tab=auto');

    // base-ui's switch is a span: disabled shows as aria-disabled.
    expect(await screen.findByRole('switch', { name: 'comments.rules.toggle' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('button', { name: 'createRule' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'comments.choosePlan' })).toHaveAttribute('href', '/account/billing');
  });
});
