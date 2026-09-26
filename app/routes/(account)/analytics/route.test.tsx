import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customerAnalyticsApi } from '~/api/customerAnalytics';
import { customerCommentsApi } from '~/api/customerComments';
import { customerChannelsApi } from '~/api/customerFlows';
import { makeQueryClient } from '~/lib/query-client';
import type {
  AnalyticsAutomations,
  AnalyticsFlowDetail,
  AnalyticsFlowRow,
  AnalyticsOverview,
} from '~/types/customerAnalytics';
import type { CustomerChannel } from '~/types/customerChannels';
import type { CustomerCommentPost } from '~/types/customerComments';
import AnalyticsPage from './route';

// The key, plus the values put into it — so the numbers the мизоҷ is shown are checked too.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && Object.keys(options).length > 0 ? `${key} ${JSON.stringify(options)}` : key,
    i18n: { language: 'tg' },
  }),
}));
vi.mock('~/api/customerAnalytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerAnalytics')>()),
  customerAnalyticsApi: { overview: vi.fn(), automations: vi.fn(), flow: vi.fn() },
}));
vi.mock('~/api/customerComments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerComments')>()),
  customerCommentsApi: { posts: vi.fn() },
}));
vi.mock('~/api/customerFlows', () => ({ customerChannelsApi: { list: vi.fn() } }));
// The pickers are third-party widgets (Base UI, flatpickr) with their own tests — plain inputs here.
vi.mock('~/components/shared/CustomSelect', () => ({
  CustomSelect: (props: {
    placeholder?: string;
    options: { value: string; label: string }[];
    value?: string | null;
    onChange: (value: unknown) => void;
  }) => (
    <select
      aria-label={props.placeholder}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value || null)}>
      <option value="">—</option>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock('~/components/shared/DateInputField', () => ({
  DateInputField: (props: { label?: string; onChange: (value: string | null) => void }) => (
    <input type="date" aria-label={props.label} onChange={(e) => props.onChange(e.target.value || null)} />
  ),
}));

// 01:00 on the 27th in Dushanbe, still the 26th in UTC — the page must count Dushanbe days.
const NOW = new Date('2026-09-26T20:00:00Z');
const TODAY = '2026-09-27';

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

function overview(overrides: Partial<AnalyticsOverview> = {}): AnalyticsOverview {
  return {
    from: '2026-08-29',
    to: TODAY,
    newContacts: { current: 12, previous: 10 },
    inboundMessages: { current: 40, previous: 50 },
    automaticReplies: { current: 30, previous: 0 },
    manualReplies: { current: 5, previous: 5 },
    comments: { current: 0, previous: 0 },
    started: { current: 8, previous: 4 },
    converted: { current: 2, previous: 1 },
    days: [
      { date: '2026-09-26', newContacts: 1, inboundMessages: 2, automaticReplies: 3 },
      { date: TODAY, newContacts: 0, inboundMessages: 1, automaticReplies: 1 },
    ],
    broadcasts: { broadcasts: 2, sent: 15, skipped: 3, failed: 1 },
    topPosts: [
      { channelId: 'ch1', mediaId: 'm1', comments: 9, autoReplied: 4 },
      { channelId: 'ch1', mediaId: 'm2', comments: 3, autoReplied: 0 },
    ],
    ...overrides,
  };
}

function flowRow(overrides: Partial<AnalyticsFlowRow> = {}): AnalyticsFlowRow {
  return {
    flowId: 'f1',
    channelId: 'ch1',
    name: 'Нарх',
    isActive: true,
    hasConversionStep: true,
    started: { current: 8, previous: 4 },
    converted: { current: 2, previous: 1 },
    ...overrides,
  };
}

function automations(overrides: Partial<AnalyticsAutomations> = {}): AnalyticsAutomations {
  return {
    from: '2026-08-29',
    to: TODAY,
    flows: [
      flowRow(),
      flowRow({
        flowId: 'f2',
        name: 'Салом',
        isActive: false,
        hasConversionStep: false,
        started: { current: 3, previous: 0 },
        converted: { current: 0, previous: 0 },
      }),
    ],
    rules: [
      {
        ruleId: 'r1',
        channelId: 'ch1',
        name: 'Калимаи нарх',
        isActive: true,
        comments: 9,
        publicReplies: 8,
        directMessages: 7,
        errors: 1,
        askedToFollow: 4,
        followedAfterAsking: 1,
      },
    ],
    ...overrides,
  };
}

function flowDetail(overrides: Partial<AnalyticsFlowDetail> = {}): AnalyticsFlowDetail {
  return {
    flowId: 'f1',
    name: 'Нарх',
    hasConversionStep: true,
    from: '2026-08-29',
    to: TODAY,
    started: { current: 8, previous: 4 },
    converted: { current: 2, previous: 1 },
    days: [{ date: TODAY, started: 2, converted: 1 }],
    recentStarters: [
      { contactId: 'k1', name: 'Сино', username: 'sino', startedAt: '2026-09-26T10:00:00Z', converted: true },
      { contactId: 'k2', name: null, username: null, startedAt: '2026-09-25T10:00:00Z', converted: false },
    ],
    ...overrides,
  };
}

function post(overrides: Partial<CustomerCommentPost>): CustomerCommentPost {
  return {
    mediaId: 'm1',
    mediaType: 'IMAGE',
    imageUrl: null,
    permalink: null,
    caption: null,
    timestamp: '2026-09-20T10:00:00Z',
    commentCount: 9,
    newCount: 0,
    ...overrides,
  };
}

function renderPage(path = '/account/analytics') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={makeQueryClient()}>
        <AnalyticsPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const card = (key: string) => screen.getByRole('region', { name: `analytics.cards.${key}` });
const lastOverviewQuery = () => vi.mocked(customerAnalyticsApi.overview).mock.calls.at(-1)?.[0];

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel()]);
    vi.mocked(customerAnalyticsApi.overview).mockResolvedValue(overview());
    vi.mocked(customerAnalyticsApi.automations).mockResolvedValue(automations());
    vi.mocked(customerAnalyticsApi.flow).mockResolvedValue(flowDetail());
    vi.mocked(customerCommentsApi.posts).mockResolvedValue({ items: [], nextCursor: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for the last 30 Dushanbe days of every account, and shows each number against the one before', async () => {
    renderPage();

    await screen.findByRole('region', { name: 'analytics.cards.newContacts' });
    expect(customerAnalyticsApi.overview).toHaveBeenCalledWith({ from: '2026-08-29', to: TODAY, channelId: undefined });
    expect(customerAnalyticsApi.automations).toHaveBeenCalledWith({
      from: '2026-08-29',
      to: TODAY,
      channelId: undefined,
    });

    expect(card('newContacts')).toHaveTextContent('12');
    expect(card('newContacts')).toHaveTextContent('↑ +20%');
    expect(card('newContacts')).toHaveTextContent('analytics.cards.previous {"value":"10"}');
    expect(card('inboundMessages')).toHaveTextContent('↓ −20%');
    expect(card('automaticReplies')).toHaveTextContent('↑ +30'); // nothing before — the number, not a share of zero
    expect(within(card('comments')).queryByText(/↑|↓|%/)).not.toBeInTheDocument();
    expect(card('converted')).toHaveTextContent('analytics.cards.convertedHint {"started":"8","rate":25}');
    expect(screen.getByText(/analytics\.range \{"from":"29\.08\.2026","to":"27\.09\.2026"\}/)).toHaveTextContent(
      'analytics.compared {"from":"30.07.2026","to":"28.08.2026"}'
    );
  });

  it("asks only for the мизоҷ's own account — an id typed into the URL is ignored", async () => {
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel(), channel({ id: 'ch2', name: 'second' })]);

    const { unmount } = renderPage('/account/analytics?channel=ch2');
    await waitFor(() => expect(lastOverviewQuery()).toMatchObject({ channelId: 'ch2' }));
    expect(customerAnalyticsApi.automations).toHaveBeenLastCalledWith(expect.objectContaining({ channelId: 'ch2' }));
    unmount();
    vi.clearAllMocks();

    renderPage('/account/analytics?channel=someone-elses-account');
    await screen.findByRole('region', { name: 'analytics.cards.newContacts' });
    expect(customerAnalyticsApi.overview).toHaveBeenCalledTimes(1);
    expect(lastOverviewQuery()?.channelId).toBeUndefined();
    expect(vi.mocked(customerAnalyticsApi.automations).mock.calls.every(([q]) => q.channelId === undefined)).toBe(true);
  });

  it('switches the account, and back to all of them', async () => {
    const user = userEvent.setup();
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel(), channel({ id: 'ch2', name: 'second' })]);
    vi.mocked(customerAnalyticsApi.overview).mockImplementation(async (q) =>
      overview({ newContacts: q.channelId === 'ch2' ? { current: 3, previous: 1 } : { current: 12, previous: 10 } })
    );
    renderPage();
    await waitFor(() => expect(card('newContacts')).toHaveTextContent('12'));

    await user.selectOptions(screen.getByRole('combobox', { name: 'analytics.allAccounts' }), 'ch2');
    await waitFor(() => expect(card('newContacts')).toHaveTextContent('3'));
    expect(lastOverviewQuery()).toMatchObject({ channelId: 'ch2' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'analytics.allAccounts' }), '');
    await waitFor(() => expect(card('newContacts')).toHaveTextContent('12'));
  });

  it('asks for 7 days', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'analytics.cards.newContacts' });

    await user.click(screen.getByRole('button', { name: 'analytics.period.days {"count":7}' }));

    await waitFor(() => expect(lastOverviewQuery()).toMatchObject({ from: '2026-09-21', to: TODAY }));
    expect(screen.getByRole('button', { name: 'analytics.period.days {"count":7}' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('asks for picked dates only once they make a period, and says why not', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'analytics.cards.newContacts' });

    await user.click(screen.getByRole('button', { name: 'analytics.period.custom' }));
    fireEvent.change(screen.getByLabelText('analytics.period.from'), { target: { value: '2026-09-01' } });
    await waitFor(() => expect(lastOverviewQuery()).toMatchObject({ from: '2026-09-01', to: TODAY }));

    fireEvent.change(screen.getByLabelText('analytics.period.to'), { target: { value: '2026-08-15' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('analytics.period.errors.order');

    fireEvent.change(screen.getByLabelText('analytics.period.to'), { target: { value: '' } });
    expect(screen.getByRole('alert')).toHaveTextContent('analytics.period.errors.missing');

    expect(vi.mocked(customerAnalyticsApi.overview).mock.calls.every(([q]) => q.to === TODAY && q.from <= q.to)).toBe(
      true
    );
  });

  it('never asks for a period the server would refuse, even from the URL', async () => {
    renderPage('/account/analytics?from=2026-09-01&to=2027-01-01');

    await screen.findByRole('region', { name: 'analytics.cards.newContacts' });
    expect(customerAnalyticsApi.overview).toHaveBeenCalledWith({ from: '2026-08-29', to: TODAY, channelId: undefined });
  });

  it('keeps the dates with their own numbers while a new period loads', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'analytics.cards.newContacts' });
    vi.mocked(customerAnalyticsApi.overview).mockReturnValue(new Promise(() => undefined));

    await user.click(screen.getByRole('button', { name: 'analytics.period.days {"count":7}' }));

    await waitFor(() => expect(lastOverviewQuery()).toMatchObject({ from: '2026-09-21' }));
    expect(screen.getByText(/analytics\.range \{"from":"29\.08\.2026"/)).toBeInTheDocument(); // the old numbers' own dates
    expect(card('newContacts').closest('.opacity-60')).not.toBeNull();
  });

  it('shows each automation with its goal — or the tip to add one', async () => {
    renderPage();

    const price = await screen.findByRole('button', { name: /Нарх/ });
    expect(price).toHaveTextContent('· 25%');
    const hello = screen.getByRole('button', { name: /Салом/ });
    expect(hello).toHaveTextContent('analytics.flows.noGoal');
    expect(hello).toHaveTextContent('analytics.flows.inactive');
    expect(screen.getByText('analytics.flows.goalTip')).toBeInTheDocument();

    const rule = screen.getByLabelText('Калимаи нарх');
    expect(rule).toHaveTextContent('4 → 1 · 25%');
  });

  it("opens an automation's days and starters for the same period, each linking to the contact", async () => {
    const user = userEvent.setup();
    renderPage('/account/analytics?days=7');

    await user.click(await screen.findByRole('button', { name: /Нарх/ }));

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Сино');
    expect(customerAnalyticsApi.flow).toHaveBeenCalledWith('f1', { from: '2026-09-21', to: TODAY });
    expect(within(dialog).getByRole('link', { name: /Сино/ })).toHaveAttribute('href', '/account/contacts?c=k1');
    expect(within(dialog).getByRole('link', { name: /Сино/ })).toHaveTextContent('analytics.flow.reachedGoal');
    expect(within(dialog).getByRole('link', { name: /analytics\.flow\.unnamed/ })).toHaveAttribute(
      'href',
      '/account/contacts?c=k2'
    );
    expect(within(dialog).getByRole('link', { name: 'analytics.flow.openEditor' })).toHaveAttribute(
      'href',
      '/account/automations/flows/f1'
    );
  });

  it('never asks for an automation id typed into the URL', async () => {
    renderPage('/account/analytics?flow=someone-elses-flow');

    await screen.findByRole('button', { name: /Нарх/ });
    expect(customerAnalyticsApi.flow).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("links a top post to its comments and to Instagram's own page only", async () => {
    vi.mocked(customerCommentsApi.posts).mockResolvedValue({
      items: [
        post({
          mediaId: 'm1',
          caption: 'Тирамоҳ',
          imageUrl: 'https://scontent.cdninstagram.com/a.jpg',
          permalink: 'https://www.instagram.com/p/abc/',
        }),
        post({
          mediaId: 'm2',
          caption: 'Дигар',
          imageUrl: 'http://tracker.example/a.jpg',
          permalink: 'javascript:alert(1)',
        }),
      ],
      nextCursor: null,
    });
    const { container } = renderPage();

    await screen.findByText('Тирамоҳ');
    const instagram = screen.getAllByRole('link', { name: 'analytics.posts.openInstagram' });
    expect(instagram).toHaveLength(1);
    expect(instagram[0]).toHaveAttribute('href', 'https://www.instagram.com/p/abc/');
    expect(instagram[0]).toHaveAttribute('target', '_blank');
    expect(instagram[0]).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getAllByRole('link', { name: 'analytics.posts.openComments' })[0]).toHaveAttribute(
      'href',
      '/account/comments?channel=ch1&post=m1'
    );
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://scontent.cdninstagram.com/a.jpg');
    expect(images[0]).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(customerCommentsApi.posts).toHaveBeenCalledTimes(1); // both posts, one request
    expect(customerCommentsApi.posts).toHaveBeenCalledWith('ch1', undefined);
  });

  it('never asks Instagram for posts of an account that must reconnect', async () => {
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel({ requiresReconnect: true })]);
    renderPage();

    await screen.findByText(/analytics\.posts\.comments \{"count":9\}/);
    expect(customerCommentsApi.posts).not.toHaveBeenCalled();
  });

  it('without an account asks for nothing and offers to connect one', async () => {
    vi.mocked(customerChannelsApi.list).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('analytics.noChannel')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'analytics.connectInstagram' })).toHaveAttribute(
      'href',
      '/account/settings'
    );
    expect(customerAnalyticsApi.overview).not.toHaveBeenCalled();
    expect(customerAnalyticsApi.automations).not.toHaveBeenCalled();
  });

  it('says so when the numbers could not be loaded', async () => {
    vi.mocked(customerAnalyticsApi.overview).mockRejectedValue({ response: { status: 404 } }); // not retried
    renderPage();

    expect(await screen.findByText('analytics.loadFailed')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'analytics.cards.newContacts' })).not.toBeInTheDocument();
  });
});
