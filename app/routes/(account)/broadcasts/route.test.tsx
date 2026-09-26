import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customerBroadcastsApi } from '~/api/customerBroadcasts';
import { customerContactsApi } from '~/api/customerContacts';
import { customerChannelsApi, customerFlowsApi } from '~/api/customerFlows';
import { makeQueryClient } from '~/lib/query-client';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { CustomerChannel } from '~/types/customerChannels';
import type { BroadcastDetail, BroadcastListItem } from '~/types/customerBroadcasts';
import type { FlowListItem } from '~/types/flow';
import BroadcastsPage from './route';

// The key, plus the values put into it — so the numbers the мизоҷ is shown are checked too.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && Object.keys(options).length > 0 ? `${key} ${JSON.stringify(options)}` : key,
    i18n: { language: 'tg' },
  }),
}));
vi.mock('~/api/customerBroadcasts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerBroadcasts')>()),
  customerBroadcastsApi: {
    list: vi.fn(),
    get: vi.fn(),
    audience: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('~/api/customerContacts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerContacts')>()),
  customerContactsApi: { tags: vi.fn() },
}));
vi.mock('~/api/customerFlows', () => ({
  customerChannelsApi: { list: vi.fn() },
  customerFlowsApi: { list: vi.fn(), uploadMedia: vi.fn() },
}));
// The pickers are third-party widgets (Base UI, flatpickr) with their own tests — plain inputs here.
vi.mock('~/components/shared/CustomSelect', () => ({
  CustomSelect: (props: {
    isMulti?: boolean;
    placeholder?: string;
    options: { value: string; label: string }[];
    value?: string | string[] | null;
    onChange: (value: unknown) => void;
  }) => (
    <select
      aria-label={props.placeholder}
      multiple={!!props.isMulti}
      value={props.isMulti ? ((props.value as string[]) ?? []) : ((props.value as string) ?? '')}
      onChange={(e) =>
        props.isMulti
          ? props.onChange(Array.from(e.target.selectedOptions).map((o) => o.value))
          : props.onChange(e.target.value || null)
      }>
      {!props.isMulti && <option value="">—</option>}
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock('~/components/shared/DateInputField', () => ({
  DateInputField: (props: { placeholder?: string; onChange: (value: string | null) => void }) => (
    <input type="date" aria-label={props.placeholder} onChange={(e) => props.onChange(e.target.value || null)} />
  ),
}));
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

function broadcast(overrides: Partial<BroadcastListItem> = {}): BroadcastListItem {
  return {
    id: 'b1',
    channelId: 'ch1',
    name: 'Аксияи тирамоҳ',
    status: 'Finished',
    kind: 'message',
    scheduledAt: '2026-09-25T10:00:00Z',
    startedAt: '2026-09-25T10:00:00Z',
    finishedAt: '2026-09-25T10:05:00Z',
    recipients: 12,
    sent: 9,
    failed: 1,
    skipped: 2,
    notReachable: 30,
    error: null,
    ...overrides,
  };
}

function detail(summary: Partial<BroadcastListItem> = {}, overrides: Partial<BroadcastDetail> = {}): BroadcastDetail {
  return {
    summary: broadcast(summary),
    tags: ['vip'],
    text: 'Салом, {{firstName}}!',
    mediaPreviewDataUri: null,
    buttonTitle: 'Дидан',
    buttonUrl: 'https://shop.example/new',
    flowId: null,
    flowName: null,
    failures: [{ contactId: 'k9', name: 'Сино', username: 'sino', error: 'Тирезаи 24-соата баста аст.' }],
    ...overrides,
  };
}

function flow(id: string, name: string, isActive: boolean): FlowListItem {
  return {
    id,
    channelId: 'ch1',
    name,
    isActive,
    triggerType: 'instagram_dm',
    nodeCount: 2,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
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

function renderPage(path = '/account/broadcasts') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={makeQueryClient()}>
        <BroadcastsPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

/** The topmost dialog — the confirmation over the form or the card. */
const topDialog = () => screen.getAllByRole('dialog').at(-1)!;

async function openForm() {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole('button', { name: /broadcasts\.new/ }));
  await screen.findByRole('textbox', { name: 'broadcasts.form.name' });
  return user;
}

async function fillMessage(user: ReturnType<typeof userEvent.setup>, name = 'Аксия', text = 'Салом!') {
  await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.name' }), name);
  await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.text' }), text);
}

async function sendAndConfirm(user: ReturnType<typeof userEvent.setup>, button = 'broadcasts.form.sendNow') {
  await user.click(screen.getByRole('button', { name: button }));
  await screen.findByText('broadcasts.confirm.send.title');
  await user.click(within(topDialog()).getByRole('button', { name: button }));
}

describe('BroadcastsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn(true);
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel()]);
    vi.mocked(customerBroadcastsApi.list).mockResolvedValue([
      broadcast(),
      broadcast({
        id: 'b2',
        name: 'Пагоҳ',
        status: 'Scheduled',
        startedAt: null,
        finishedAt: null,
        recipients: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      }),
    ]);
    vi.mocked(customerBroadcastsApi.get).mockResolvedValue(detail());
    vi.mocked(customerBroadcastsApi.audience).mockResolvedValue({ audience: 4, reachable: 2 });
    vi.mocked(customerBroadcastsApi.create).mockResolvedValue(broadcast({ id: 'new1', status: 'Scheduled' }));
    vi.mocked(customerBroadcastsApi.cancel).mockResolvedValue();
    vi.mocked(customerBroadcastsApi.remove).mockResolvedValue();
    vi.mocked(customerContactsApi.tags).mockResolvedValue([
      { tag: 'vip', count: 3 },
      { tag: 'lead', count: 5 },
    ]);
    vi.mocked(customerFlowsApi.list).mockResolvedValue([flow('f1', 'Нарх', true), flow('f2', 'Кӯҳна', false)]);
  });

  // ── The list and the card ─────────────────────────────────────────────────────────────

  it('lists the мизоҷ’s broadcasts — state, when, and the numbers once sending began', async () => {
    renderPage();

    const finished = await screen.findByRole('button', { name: /Аксияи тирамоҳ/ });
    expect(within(finished).getByText('broadcasts.status.Finished')).toBeInTheDocument();
    expect(within(finished).getByText('broadcasts.counts {"sent":9,"skipped":2,"failed":1}')).toBeInTheDocument();
    const waiting = screen.getByRole('button', { name: /Пагоҳ/ });
    expect(within(waiting).getByText('broadcasts.status.Scheduled')).toBeInTheDocument();
    expect(within(waiting).queryByText(/broadcasts\.counts/)).not.toBeInTheDocument();
  });

  it('one whose time has come says it waits for the account’s sending one — or that it is starting', async () => {
    const past = '2026-01-01T10:00:00Z';
    vi.mocked(customerBroadcastsApi.list).mockResolvedValue([
      broadcast({ id: 's1', name: 'Ҳоло меравад', status: 'Sending', finishedAt: null }),
      broadcast({
        id: 'w1',
        name: 'Интизор',
        status: 'Scheduled',
        scheduledAt: past,
        startedAt: null,
        finishedAt: null,
      }),
      broadcast({
        id: 'w2',
        channelId: 'ch2',
        name: 'Аккаунти дигар',
        status: 'Scheduled',
        scheduledAt: past,
        startedAt: null,
        finishedAt: null,
      }),
    ]);
    renderPage();

    const waiting = await screen.findByRole('button', { name: /Интизор/ });
    expect(within(waiting).getByText('broadcasts.when.waiting')).toBeInTheDocument();
    const other = screen.getByRole('button', { name: /Аккаунти дигар/ });
    expect(within(other).getByText('broadcasts.when.starting')).toBeInTheDocument();
  });

  it('a failed broadcast says why in the list, not "0 · 0 · 0"', async () => {
    vi.mocked(customerBroadcastsApi.list).mockResolvedValue([
      broadcast({ status: 'Failed', recipients: 0, sent: 0, failed: 0, skipped: 0, error: 'Тариф фаъол нест.' }),
    ]);
    renderPage();

    const failed = await screen.findByRole('button', { name: /Аксияи тирамоҳ/ });
    expect(within(failed).getByText('Тариф фаъол нест.')).toBeInTheDocument();
    expect(within(failed).queryByText(/broadcasts\.counts/)).not.toBeInTheDocument();
  });

  it('opens the card: numbers, what was sent, who it failed for — and removes it after confirming', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Аксияи тирамоҳ/ }));

    const card = await screen.findByRole('dialog');
    await within(card).findByText('Сино');
    expect(customerBroadcastsApi.get).toHaveBeenCalledWith('b1');
    // The message as written, the name placeholder shown as what it becomes.
    expect(within(card).getByText('broadcasts.form.insertName')).toBeInTheDocument();
    expect(within(card).queryByText(/\{\{firstName\}\}/)).not.toBeInTheDocument();
    for (const n of ['9', '2', '1', '30']) expect(within(card).getByText(n)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Дидан/ })).toHaveAttribute('href', 'https://shop.example/new');
    expect(within(card).getByText('Сино')).toBeInTheDocument();
    expect(within(card).getByText('Тирезаи 24-соата баста аст.')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'broadcasts.actions.delete' }));
    expect(customerBroadcastsApi.remove).not.toHaveBeenCalled();
    await user.click(within(topDialog()).getByRole('button', { name: 'broadcasts.actions.delete' }));

    await waitFor(() => expect(customerBroadcastsApi.remove).toHaveBeenCalledWith('b1'));
    await waitFor(() => expect(screen.queryByText('Сино')).not.toBeInTheDocument());
  });

  it('stops a sending broadcast after confirming', async () => {
    vi.mocked(customerBroadcastsApi.get).mockResolvedValue(detail({ status: 'Sending', finishedAt: null }));
    const user = userEvent.setup();
    renderPage('/account/broadcasts?b=b1');

    await user.click(await screen.findByRole('button', { name: 'broadcasts.actions.stop' }));
    await user.click(within(topDialog()).getByRole('button', { name: 'broadcasts.actions.stop' }));

    await waitFor(() => expect(customerBroadcastsApi.cancel).toHaveBeenCalledWith('b1'));
    expect(customerBroadcastsApi.remove).not.toHaveBeenCalled();
  });

  it('cancels one that has not started', async () => {
    vi.mocked(customerBroadcastsApi.get).mockResolvedValue(
      detail({ status: 'Scheduled', startedAt: null, finishedAt: null })
    );
    const user = userEvent.setup();
    renderPage('/account/broadcasts?b=b1');

    expect(await screen.findByText('broadcasts.notStarted')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'broadcasts.actions.cancel' }));
    await user.click(within(topDialog()).getByRole('button', { name: 'broadcasts.actions.cancel' }));

    await waitFor(() => expect(customerBroadcastsApi.cancel).toHaveBeenCalledWith('b1'));
  });

  it('a broadcast id in the address that is not the мизоҷ’s own is simply not found', async () => {
    vi.mocked(customerBroadcastsApi.get).mockRejectedValue({ response: { status: 404 } });
    renderPage('/account/broadcasts?b=someone-elses');

    expect(await screen.findByText('broadcasts.notFound')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /broadcasts\.actions/ })).not.toBeInTheDocument();
  });

  it('never turns a non-web button link into a link', async () => {
    vi.mocked(customerBroadcastsApi.get).mockResolvedValue(detail({}, { buttonUrl: 'javascript:alert(1)' }));
    renderPage('/account/broadcasts?b=b1');

    await screen.findByText('Сино');
    expect(screen.queryByRole('link', { name: /Дидан/ })).not.toBeInTheDocument();
  });

  it('without a plan: no new broadcast — stopping one still works', async () => {
    signIn(false);
    vi.mocked(customerBroadcastsApi.get).mockResolvedValue(detail({ status: 'Sending', finishedAt: null }));
    const user = userEvent.setup();
    renderPage('/account/broadcasts?b=b1');

    expect(await screen.findByText('broadcasts.readOnlyPlan')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'broadcasts.actions.stop' }));
    await user.click(within(topDialog()).getByRole('button', { name: 'broadcasts.actions.stop' }));
    await waitFor(() => expect(customerBroadcastsApi.cancel).toHaveBeenCalledWith('b1'));
    expect(screen.getByRole('button', { name: /broadcasts\.new/, hidden: true })).toBeDisabled();
  });

  it('with no Instagram connected, points to connecting it', async () => {
    vi.mocked(customerChannelsApi.list).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole('link', { name: 'contacts.connectInstagram' })).toHaveAttribute(
      'href',
      '/account/settings'
    );
  });

  // ── A new broadcast ───────────────────────────────────────────────────────────────────

  it('to everyone, now: shows who it reaches, confirms that number, sends the request', async () => {
    const user = await openForm();

    expect(await screen.findByText('broadcasts.form.reach {"count":2,"total":4}')).toBeInTheDocument();
    expect(customerBroadcastsApi.audience).toHaveBeenCalledWith('ch1', []);
    await fillMessage(user, 'Аксия', 'Салом, ');
    await user.click(screen.getByRole('button', { name: 'broadcasts.form.insertName' }));
    await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.text' }), '!');

    await user.click(screen.getByRole('button', { name: 'broadcasts.form.sendNow' }));
    expect(await screen.findByText('broadcasts.confirm.send.now {"count":2}')).toBeInTheDocument();
    await user.click(within(topDialog()).getByRole('button', { name: 'broadcasts.form.sendNow' }));

    await waitFor(() =>
      expect(customerBroadcastsApi.create).toHaveBeenCalledWith({
        channelId: 'ch1',
        name: 'Аксия',
        tags: [],
        text: 'Салом, {{firstName}}!',
        mediaId: null,
        mediaPreviewDataUri: null,
        buttonTitle: null,
        buttonUrl: null,
        flowId: null,
        scheduledAt: null,
      })
    );
    // The new one's card opens.
    await waitFor(() => expect(customerBroadcastsApi.get).toHaveBeenCalledWith('new1'));
  });

  it('"by tag" with no tag chosen yet shows no number — not the one for everyone', async () => {
    const user = await openForm();
    await screen.findByText('broadcasts.form.reach {"count":2,"total":4}');

    await user.click(screen.getByRole('radio', { name: 'broadcasts.form.byTag' }));
    expect(screen.queryByText(/broadcasts\.form\.reach/)).not.toBeInTheDocument();

    vi.mocked(customerBroadcastsApi.audience).mockResolvedValue({ audience: 3, reachable: 1 });
    await user.selectOptions(screen.getByRole('listbox', { name: 'broadcasts.form.pickTags' }), 'vip');
    expect(await screen.findByText('broadcasts.form.reach {"count":1,"total":3}')).toBeInTheDocument();
  });

  it('to a tag: counts and sends only that tag', async () => {
    const user = await openForm();

    await user.click(screen.getByRole('radio', { name: 'broadcasts.form.byTag' }));
    await user.selectOptions(screen.getByRole('listbox', { name: 'broadcasts.form.pickTags' }), 'vip');
    await waitFor(() => expect(customerBroadcastsApi.audience).toHaveBeenCalledWith('ch1', ['vip']));
    await fillMessage(user);
    await sendAndConfirm(user);

    await waitFor(() =>
      expect(customerBroadcastsApi.create).toHaveBeenCalledWith(expect.objectContaining({ tags: ['vip'] }))
    );
  });

  it('back to everyone after picking a tag: goes to everyone, not the tag', async () => {
    const user = await openForm();

    await user.click(screen.getByRole('radio', { name: 'broadcasts.form.byTag' }));
    await user.selectOptions(screen.getByRole('listbox', { name: 'broadcasts.form.pickTags' }), 'vip');
    await user.click(screen.getByRole('radio', { name: 'broadcasts.form.everyone' }));
    await fillMessage(user);
    await sendAndConfirm(user);

    await waitFor(() =>
      expect(customerBroadcastsApi.create).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }))
    );
  });

  it('says what is missing instead of sending', async () => {
    const user = await openForm();

    await user.click(screen.getByRole('button', { name: 'broadcasts.form.sendNow' }));

    expect(screen.getByText('broadcasts.form.problems.name')).toBeInTheDocument();
    expect(screen.getByText('broadcasts.form.problems.message')).toBeInTheDocument();
    expect(screen.queryByText('broadcasts.confirm.send.title')).not.toBeInTheDocument();

    await fillMessage(user);
    await user.click(screen.getByRole('button', { name: 'broadcasts.form.addButton' }));
    await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.buttonTitle' }), 'Дидан');
    await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.buttonUrl' }), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'broadcasts.form.sendNow' }));

    expect(screen.getByText('broadcasts.form.problems.button')).toBeInTheDocument();
    expect(screen.queryByText('broadcasts.confirm.send.title')).not.toBeInTheDocument();
    expect(customerBroadcastsApi.create).not.toHaveBeenCalled();
  });

  it('with a link button: sends its title and address', async () => {
    const user = await openForm();

    await fillMessage(user);
    await user.click(screen.getByRole('button', { name: 'broadcasts.form.addButton' }));
    await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.buttonTitle' }), 'Дидан');
    await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.buttonUrl' }), 'https://shop.example');
    await sendAndConfirm(user);

    await waitFor(() =>
      expect(customerBroadcastsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ buttonTitle: 'Дидан', buttonUrl: 'https://shop.example' })
      )
    );
  });

  it('cannot send now while the number is still coming — scheduling can go ahead', async () => {
    vi.mocked(customerBroadcastsApi.audience).mockReturnValue(new Promise(() => undefined));
    const user = await openForm();
    await fillMessage(user);

    expect(screen.getByRole('button', { name: 'broadcasts.form.sendNow' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'broadcasts.form.later' }));
    expect(screen.getByRole('button', { name: 'broadcasts.form.schedule' })).toBeEnabled();
  });

  it('cannot send now when nobody can be reached now', async () => {
    vi.mocked(customerBroadcastsApi.audience).mockResolvedValue({ audience: 3, reachable: 0 });
    const user = await openForm();

    await screen.findByText('broadcasts.form.reach {"count":0,"total":3}');
    await fillMessage(user);
    await user.click(screen.getByRole('button', { name: 'broadcasts.form.sendNow' }));

    expect(screen.getByText('broadcasts.form.problems.nobody')).toBeInTheDocument();
    expect(screen.queryByText('broadcasts.confirm.send.title')).not.toBeInTheDocument();
  });

  it('an automation instead of a message: only the active ones, sent as the flow', async () => {
    const user = await openForm();

    await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.name' }), 'Бо flow');
    await user.click(screen.getByRole('radio', { name: 'broadcasts.form.flow' }));
    const select = await screen.findByRole('combobox', { name: 'broadcasts.form.pickFlow' });
    expect(customerFlowsApi.list).toHaveBeenCalledWith('ch1');
    expect(within(select).queryByRole('option', { name: 'Кӯҳна' })).not.toBeInTheDocument();
    await user.selectOptions(select, 'f1');
    await sendAndConfirm(user);

    await waitFor(() =>
      expect(customerBroadcastsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ flowId: 'f1', text: null, mediaId: null, buttonUrl: null })
      )
    );
  });

  it('for later: sends the chosen time — and refuses one more than 30 days away', async () => {
    const user = await openForm();
    await fillMessage(user);
    await user.click(screen.getByRole('radio', { name: 'broadcasts.form.later' }));

    fireEvent.change(screen.getByLabelText('broadcasts.form.date'), {
      target: { value: dayjs().add(40, 'day').format('YYYY-MM-DD') },
    });
    await user.click(screen.getByRole('button', { name: 'broadcasts.form.schedule' }));
    expect(screen.getByText('broadcasts.form.problems.when')).toBeInTheDocument();

    const day = dayjs().add(2, 'day').format('YYYY-MM-DD');
    fireEvent.change(screen.getByLabelText('broadcasts.form.date'), { target: { value: day } });
    fireEvent.change(screen.getByLabelText('broadcasts.form.time'), { target: { value: '15:30' } });
    await sendAndConfirm(user, 'broadcasts.form.schedule');

    await waitFor(() =>
      expect(customerBroadcastsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ scheduledAt: dayjs(`${day}T15:30`).toISOString() })
      )
    );
  });

  it('uploads an image to the мизоҷ’s own account and sends it — an image alone is enough', async () => {
    vi.mocked(customerFlowsApi.uploadMedia).mockResolvedValue({
      mediaId: '123456',
      blockType: 'image',
      previewDataUri: 'data:image/jpeg;base64,AAAA',
    });
    const user = await openForm();

    await user.type(screen.getByRole('textbox', { name: 'broadcasts.form.name' }), 'Расм');
    const file = new File(['png'], 'new.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('broadcasts.form.image'), file);

    await waitFor(() => expect(customerFlowsApi.uploadMedia).toHaveBeenCalledWith('ch1', file));
    expect(await screen.findByAltText('broadcasts.form.image')).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
    await sendAndConfirm(user);

    await waitFor(() =>
      expect(customerBroadcastsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ text: null, mediaId: '123456', mediaPreviewDataUri: 'data:image/jpeg;base64,AAAA' })
      )
    );
  });

  it('refuses anything but an image before uploading it', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /broadcasts\.new/ }));

    await user.upload(
      await screen.findByLabelText('broadcasts.form.image'),
      new File(['%PDF'], 'price.pdf', { type: 'application/pdf' })
    );

    expect(toast.error).toHaveBeenCalledWith('broadcasts.form.imageOnly');
    expect(customerFlowsApi.uploadMedia).not.toHaveBeenCalled();
  });

  it('another account: its own tags and audience, and nothing kept from the first one', async () => {
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel(), channel({ id: 'ch2', name: 'second_shop' })]);
    vi.mocked(customerFlowsApi.uploadMedia).mockResolvedValue({
      mediaId: '777',
      blockType: 'image',
      previewDataUri: 'data:image/jpeg;base64,BBBB',
    });
    const user = await openForm();

    await user.upload(
      screen.getByLabelText('broadcasts.form.image'),
      new File(['png'], 'a.png', { type: 'image/png' })
    );
    await screen.findByAltText('broadcasts.form.image');
    await user.selectOptions(screen.getByRole('combobox', { name: 'broadcasts.form.account' }), 'ch2');

    await waitFor(() => expect(customerBroadcastsApi.audience).toHaveBeenCalledWith('ch2', []));
    expect(customerContactsApi.tags).toHaveBeenCalledWith('ch2');
    expect(screen.queryByAltText('broadcasts.form.image')).not.toBeInTheDocument(); // uploaded to the first account
  });
});
