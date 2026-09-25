import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { customerContactsApi } from '~/api/customerContacts';
import { customerChannelsApi } from '~/api/customerFlows';
import { useIsMobile } from '~/hooks/use-mobile';
import { makeQueryClient } from '~/lib/query-client';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { CustomerChannel } from '~/types/customerChannels';
import type { CustomerContactDetail, CustomerContactListItem } from '~/types/customerContacts';
import ContactsPage from './route';

vi.mock('~/api/customerContacts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerContacts')>()),
  customerContactsApi: {
    list: vi.fn(),
    tags: vi.fn(),
    get: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    setVariable: vi.fn(),
    removeVariable: vi.fn(),
    remove: vi.fn(),
    export: vi.fn(),
  },
}));
vi.mock('~/api/customerFlows', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerFlows')>()),
  customerChannelsApi: { list: vi.fn() },
}));
// The staff inbox API must never be touched from the мизоҷ page — spied on to prove it.
vi.mock('~/api/conversations', () => ({ conversationsApi: { list: vi.fn(), get: vi.fn() } }));
vi.mock('~/hooks/use-mobile', () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const inAnHour = () => new Date(Date.now() + 3_600_000).toISOString();

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

function contact(overrides: Partial<CustomerContactListItem> = {}): CustomerContactListItem {
  return {
    id: 'k1',
    channelId: 'ch1',
    channelType: 'Instagram',
    channelName: 'my_shop',
    name: 'Нилуфар',
    username: 'nilufar',
    avatarUrl: null,
    tags: ['vip'],
    variables: [{ key: 'phone', value: '+992900000001' }],
    firstSeenAt: '2026-09-20T10:00:00Z',
    lastMessageAt: new Date().toISOString(),
    canMessageUntil: inAnHour(),
    ...overrides,
  };
}

function detail(overrides: Partial<CustomerContactDetail> = {}): CustomerContactDetail {
  return {
    ...contact(),
    messageCount: 12,
    commentCount: 3,
    followStatus: 'NotFollowing',
    followCheckedAt: '2026-09-24T10:00:00Z',
    automations: [{ flowId: 'f1', flowName: 'Нарх', status: 'Finished', startedAt: '2026-09-24T10:00:00Z' }],
    ...overrides,
  };
}

const page = <T,>(items: T[]) => ({ items, totalCount: items.length, page: 1, pageSize: 30 });

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

function renderPage(path = '/account/contacts') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={makeQueryClient()}>
        <ContactsPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

async function openCard() {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole('button', { name: /Нилуфар/ }));
  await screen.findByText('contacts.activity');
  return user;
}

describe('ContactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    signIn(true);
    vi.mocked(customerChannelsApi.list).mockResolvedValue([channel()]);
    vi.mocked(customerContactsApi.list).mockResolvedValue(
      page([
        contact(),
        contact({ id: 'k2', name: null, username: 'sino_77', tags: [], variables: [], canMessageUntil: null }),
      ])
    );
    vi.mocked(customerContactsApi.tags).mockResolvedValue([{ tag: 'vip', count: 1 }]);
    vi.mocked(customerContactsApi.get).mockResolvedValue(detail());
    vi.mocked(customerContactsApi.addTag).mockResolvedValue();
    vi.mocked(customerContactsApi.removeTag).mockResolvedValue();
    vi.mocked(customerContactsApi.setVariable).mockResolvedValue();
    vi.mocked(customerContactsApi.removeVariable).mockResolvedValue();
    vi.mocked(customerContactsApi.remove).mockResolvedValue();
  });

  it('lists the мизоҷ’s contacts — name or @username, tags, who can be messaged now', async () => {
    renderPage();

    const first = await screen.findByRole('button', { name: /Нилуфар/ });
    expect(within(first).getByText('vip')).toBeInTheDocument();
    expect(within(first).getByLabelText('contacts.canMessage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /@sino_77/ })).toBeInTheDocument();
    expect(customerContactsApi.list).toHaveBeenCalledWith({ channelId: undefined, search: '', tag: undefined }, 1);
    expect(conversationsApi.list).not.toHaveBeenCalled();
  });

  it('searches once typing stops', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: /Нилуфар/ });

    await user.type(screen.getByRole('textbox', { name: 'contacts.searchPlaceholder' }), 'нил');

    await waitFor(() =>
      expect(customerContactsApi.list).toHaveBeenLastCalledWith(
        { channelId: undefined, search: 'нил', tag: undefined },
        1
      )
    );
  });

  it('filters by the tag in the address', async () => {
    renderPage('/account/contacts?tag=vip');

    await screen.findByRole('button', { name: /Нилуфар/ });
    expect(customerContactsApi.list).toHaveBeenCalledWith({ channelId: undefined, search: '', tag: 'vip' }, 1);
  });

  it('ignores a channel id in the address that is not one of the мизоҷ’s own', async () => {
    renderPage('/account/contacts?channel=someone-elses');

    await screen.findByRole('button', { name: /Нилуфар/ });
    expect(customerContactsApi.list).not.toHaveBeenCalledWith(
      expect.objectContaining({ channelId: 'someone-elses' }),
      1
    );
    expect(customerContactsApi.tags).not.toHaveBeenCalledWith('someone-elses');
  });

  it('opens the card: details, activity, follow, automations, and the chat', async () => {
    await openCard();

    expect(customerContactsApi.get).toHaveBeenCalledWith('k1');
    expect(screen.getByText('+992900000001')).toBeInTheDocument();
    expect(screen.getByText('contacts.followStatus.NotFollowing')).toBeInTheDocument();
    expect(screen.getByText('Нарх')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'contacts.openChat' })).toHaveAttribute('href', '/account/chats?c=k1');
    expect(screen.getByRole('link', { name: /@nilufar/ })).toHaveAttribute('href', 'https://instagram.com/nilufar');
  });

  it('adds and removes a tag through the мизоҷ API', async () => {
    const user = await openCard();

    await user.click(screen.getByRole('button', { name: 'contacts.addTag' }));
    await user.type(screen.getByRole('textbox', { name: 'contacts.tagPlaceholder' }), '  lead {Enter}');
    await waitFor(() => expect(customerContactsApi.addTag).toHaveBeenCalledWith('k1', 'lead'));

    await user.click(screen.getByRole('button', { name: 'contacts.removeTag' }));
    await waitFor(() => expect(customerContactsApi.removeTag).toHaveBeenCalledWith('k1', 'vip'));
  });

  it('corrects a detail', async () => {
    const user = await openCard();

    await user.click(screen.getByRole('button', { name: 'contacts.editDetail' }));
    const input = screen.getByRole('textbox', { name: 'phone' });
    await user.clear(input);
    await user.type(input, '+992900000009{Enter}');

    await waitFor(() => expect(customerContactsApi.setVariable).toHaveBeenCalledWith('k1', 'phone', '+992900000009'));
  });

  it('deletes a contact only after confirming, then closes the card', async () => {
    const user = await openCard();

    await user.click(screen.getByRole('button', { name: 'contacts.delete' }));
    expect(customerContactsApi.remove).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'contacts.delete' }));

    await waitFor(() => expect(customerContactsApi.remove).toHaveBeenCalledWith('k1'));
    await waitFor(() => expect(screen.queryByText('contacts.activity')).not.toBeInTheDocument());
  });

  it('without a plan: no editing and no export — deleting a person’s data still works', async () => {
    signIn(false);
    await openCard();

    expect(screen.queryByRole('button', { name: 'contacts.addTag' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'contacts.removeTag' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'contacts.editDetail' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contacts.export/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'contacts.delete' })).toBeEnabled();
  });

  it('exports what is on screen — same filters', async () => {
    const user = userEvent.setup();
    vi.mocked(customerContactsApi.export).mockResolvedValue(new Blob(['x'], { type: 'text/csv' }));
    const createObjectURL = vi.fn(() => 'blob:contacts');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    renderPage('/account/contacts?tag=vip');
    await screen.findByRole('button', { name: /Нилуфар/ });

    await user.click(screen.getByRole('button', { name: /contacts.export/ }));

    await waitFor(() =>
      expect(customerContactsApi.export).toHaveBeenCalledWith({ channelId: undefined, search: '', tag: 'vip' }, 'tg')
    );
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });

  it('on a phone: the list, then the card alone with a way back', async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    const user = await openCard();

    expect(screen.queryByRole('button', { name: /@sino_77/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'contacts.back' }));

    expect(await screen.findByRole('button', { name: /@sino_77/ })).toBeInTheDocument();
  });

  it('with no Instagram connected, points to connecting it', async () => {
    vi.mocked(customerChannelsApi.list).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole('link', { name: 'contacts.connectInstagram' })).toHaveAttribute(
      'href',
      '/account/settings'
    );
  });
});
