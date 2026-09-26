import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { customerChatsApi } from '~/api/customerChats';
import { useIsMobile } from '~/hooks/use-mobile';
import { makeQueryClient } from '~/lib/query-client';
import type { CustomerChatDetail, CustomerChatListItem } from '~/types/customerChats';
import type { Message } from '~/types/message';
import { composerBlock } from './composerBlock';
import { contactTitle } from './contactTitle';
import ChatsPage from './route';

vi.mock('~/api/customerChats', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerChats')>()),
  customerChatsApi: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    get: vi.fn(),
    listMessages: vi.fn(),
    send: vi.fn(),
    sendMedia: vi.fn(),
    cancelMessage: vi.fn(),
    markAsRead: vi.fn(),
    getMediaBlob: vi.fn(),
    getThumbnailBlob: vi.fn(),
  },
}));
// The staff API must never be touched from the мизоҷ page — spied on to prove it.
vi.mock('~/api/conversations', () => ({
  conversationsApi: { getMediaBlob: vi.fn(), getThumbnailBlob: vi.fn(), cancelMessage: vi.fn() },
}));
vi.mock('~/hooks/use-mobile', () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const inAnHour = () => new Date(Date.now() + 3_600_000).toISOString();

function chatItem(overrides: Partial<CustomerChatListItem> = {}): CustomerChatListItem {
  return {
    id: 'c1',
    channelId: 'ch1',
    channelType: 'Instagram',
    channelName: 'my_shop',
    contactName: 'Нилуфар',
    contactAvatarUrl: null,
    contactUsername: 'nilufar',
    lastMessageAt: new Date().toISOString(),
    lastMessage: { type: 'Text', direction: 'Inbound', body: 'Нархаш чанд?' },
    unreadCount: 2,
    windowExpiresAt: inAnHour(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function chatDetail(overrides: Partial<CustomerChatDetail> = {}): CustomerChatDetail {
  const { lastMessage: _ignored, ...rest } = chatItem();
  return { ...rest, canSend: true, channelNeedsReconnect: false, ...overrides };
}

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversationId: 'c1',
    direction: 'Inbound',
    type: 'Text',
    body: 'Нархаш чанд?',
    mediaUrl: null,
    externalId: null,
    deliveryStatus: 'Delivered',
    isInternalNote: false,
    sentByUserId: null,
    sentByUserName: null,
    createdAt: new Date().toISOString(),
    mimeType: null,
    sizeBytes: null,
    originalFileName: null,
    voiceDurationSeconds: null,
    thumbnailUrl: null,
    mediaDeletedAt: null,
    mediaDownloadError: null,
    waveformPeaks: null,
    failureReason: null,
    externalContentUrl: null,
    externalContentKind: null,
    failureDetail: null,
    ...overrides,
  } as Message;
}

const page = <T,>(items: T[]) => ({ items, totalCount: items.length, page: 1, pageSize: 30 });

function renderPage(path = '/account/chats') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={makeQueryClient()}>
        <ChatsPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('composerBlock', () => {
  it('names why a reply is impossible, most important first', () => {
    expect(composerBlock(chatDetail())).toBeNull();
    expect(composerBlock(chatDetail({ canSend: false, channelNeedsReconnect: true }))).toBe('plan');
    expect(composerBlock(chatDetail({ channelNeedsReconnect: true }))).toBe('reconnect');
    expect(composerBlock(chatDetail({ windowExpiresAt: '2020-01-01T00:00:00Z' }))).toBe('window');
    expect(composerBlock(chatDetail({ windowExpiresAt: null }))).toBeNull();
  });
});

describe('contactTitle', () => {
  it('prefers the name, then @username, then the fallback', () => {
    expect(contactTitle({ contactName: 'Нилуфар', contactUsername: 'nilufar' }, '?')).toBe('Нилуфар');
    expect(contactTitle({ contactName: null, contactUsername: 'nilufar' }, '?')).toBe('@nilufar');
    expect(contactTitle({ contactName: null, contactUsername: null }, 'fan')).toBe('fan');
  });
});

describe('ChatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has neither; the thread scrolls to the newest message and frees object URLs.
    Element.prototype.scrollIntoView = vi.fn();
    URL.revokeObjectURL = vi.fn();
    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.mocked(customerChatsApi.list).mockResolvedValue(page([chatItem()]));
    vi.mocked(customerChatsApi.get).mockResolvedValue(chatDetail());
    vi.mocked(customerChatsApi.listMessages).mockResolvedValue(page([message()]));
    vi.mocked(customerChatsApi.markAsRead).mockResolvedValue(chatDetail({ unreadCount: 0 }));
  });

  it('lists the мизоҷ’s chats with preview and unread count', async () => {
    renderPage();

    expect(await screen.findByText('Нилуфар')).toBeInTheDocument();
    expect(screen.getByText('Нархаш чанд?')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('chats.pickOne')).toBeInTheDocument();
  });

  it('marks its own last reply with "you"', async () => {
    vi.mocked(customerChatsApi.list).mockResolvedValue(
      page([chatItem({ unreadCount: 0, lastMessage: { type: 'Text', direction: 'Outbound', body: 'Ташаккур' } })])
    );
    renderPage();

    expect(await screen.findByText(/chats\.you: Ташаккур/)).toBeInTheDocument();
  });

  it('with no chats, points to connecting Instagram', async () => {
    vi.mocked(customerChatsApi.list).mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText('chats.empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chats.connectInstagram' })).toHaveAttribute(
      'href',
      '/account/automations'
    );
  });

  it('opens a chat, reads it, and replies with the trimmed text', async () => {
    vi.mocked(customerChatsApi.send).mockResolvedValue(message({ id: 'm2', direction: 'Outbound' }));
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByText('Нилуфар'));

    await waitFor(() => expect(customerChatsApi.markAsRead).toHaveBeenCalledWith('c1'));
    const box = await screen.findByRole('textbox', { name: 'chats.placeholder' });
    await user.type(box, '  Салом!  {Enter}');
    await waitFor(() => expect(customerChatsApi.send).toHaveBeenCalledWith('c1', 'Салом!'));
  });

  it('sends a photo through the мизоҷ API — the chosen file, at once', async () => {
    vi.mocked(customerChatsApi.sendMedia).mockResolvedValue(
      message({ id: 'm3', direction: 'Outbound', type: 'Image' })
    );
    renderPage('/account/chats?c=c1');
    const user = userEvent.setup();
    const photo = new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' });

    await user.upload(await screen.findByLabelText('chats.attach', { selector: 'input' }), photo);

    await waitFor(() => expect(customerChatsApi.sendMedia).toHaveBeenCalledWith('c1', photo));
    expect(customerChatsApi.send).not.toHaveBeenCalled();
  });

  const bigPng = () => {
    const file = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 8 * 1024 * 1024 + 1 }); // Instagram: images up to 8 MB
    return file;
  };

  it.each([
    ['an SVG', () => new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }), 'chats.fileNotAllowed'],
    ['an HTML page', () => new File(['<html/>'], 'x.html', { type: 'text/html' }), 'chats.fileNotAllowed'],
    ['an image over 8 MB', bigPng, 'chats.fileTooBig'],
  ])('refuses %s before sending anything', async (_label, makeFile, reason) => {
    renderPage('/account/chats?c=c1');
    const user = userEvent.setup({ applyAccept: false });

    await user.upload(await screen.findByLabelText('chats.attach', { selector: 'input' }), makeFile());

    expect(toast.error).toHaveBeenCalledWith(reason);
    expect(customerChatsApi.sendMedia).not.toHaveBeenCalled();
  });

  it('Shift+Enter is a new line, not a send', async () => {
    renderPage('/account/chats?c=c1');
    const user = userEvent.setup();

    const box = await screen.findByRole('textbox', { name: 'chats.placeholder' });
    await user.type(box, 'сатри якум{Shift>}{Enter}{/Shift}сатри дуюм');

    expect(customerChatsApi.send).not.toHaveBeenCalled();
    expect(box).toHaveValue('сатри якум\nсатри дуюм');
  });

  it.each([
    [{ canSend: false }, 'chats.blocked.plan', '/account/billing'],
    [{ channelNeedsReconnect: true }, 'chats.blocked.reconnect', '/account/automations'],
    [{ windowExpiresAt: '2020-01-01T00:00:00Z' }, 'chats.blocked.window', null],
  ] as const)('says why it cannot reply instead of offering a box (%o)', async (overrides, reason, link) => {
    vi.mocked(customerChatsApi.get).mockResolvedValue(chatDetail(overrides));
    renderPage('/account/chats?c=c1');

    const note = await screen.findByRole('note');
    expect(within(note).getByText(reason)).toBeInTheDocument();
    if (link) expect(within(note).getByRole('link')).toHaveAttribute('href', link);
    expect(screen.queryByRole('textbox', { name: 'chats.placeholder' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'chats.attach' })).not.toBeInTheDocument(); // no file either
  });

  it('fetches media through the мизоҷ API only — never the staff one', async () => {
    vi.mocked(customerChatsApi.getThumbnailBlob).mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
    vi.mocked(customerChatsApi.getMediaBlob).mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    URL.createObjectURL = vi.fn(() => 'blob:x');
    vi.mocked(customerChatsApi.listMessages).mockResolvedValue(
      page([
        message({
          id: 'img1',
          type: 'Image',
          body: null,
          mediaUrl: '/api/public/messages/img1/media',
          thumbnailUrl: '/api/public/messages/img1/thumbnail',
          mimeType: 'image/png',
        }),
      ])
    );
    renderPage('/account/chats?c=c1');

    await waitFor(() =>
      expect(
        vi.mocked(customerChatsApi.getThumbnailBlob).mock.calls.length +
          vi.mocked(customerChatsApi.getMediaBlob).mock.calls.length
      ).toBeGreaterThan(0)
    );
    expect(conversationsApi.getMediaBlob).not.toHaveBeenCalled();
    expect(conversationsApi.getThumbnailBlob).not.toHaveBeenCalled();
  });

  it('cancels a pending reply through the мизоҷ API — never the staff one', async () => {
    vi.mocked(customerChatsApi.cancelMessage).mockResolvedValue(message({ id: 'p1', deliveryStatus: 'Cancelled' }));
    vi.mocked(customerChatsApi.listMessages).mockResolvedValue(
      page([message({ id: 'p1', direction: 'Outbound', deliveryStatus: 'Pending', body: 'Салом' })])
    );
    renderPage('/account/chats?c=c1');

    await userEvent.click(await screen.findByRole('button', { name: 'cancelSend' }));

    await waitFor(() => expect(customerChatsApi.cancelMessage).toHaveBeenCalledWith('c1', 'p1'));
    expect(conversationsApi.cancelMessage).not.toHaveBeenCalled();
  });

  it('on a phone shows the list, then the chat alone with a way back', async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByText('Нилуфар'));

    expect(await screen.findByRole('button', { name: 'chats.back' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('chats.search')).not.toBeInTheDocument();
  });
});
