import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customerChatsApi } from '~/api/customerChats';
import { makeQueryClient } from '~/lib/query-client';
import type { CustomerChatDetail } from '~/types/customerChats';
import { ChatComposer } from './ChatComposer';

vi.mock('~/api/customerChats', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerChats')>()),
  customerChatsApi: { send: vi.fn(), sendMedia: vi.fn(), sendVoiceNote: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

class FakeRecorder {
  static isTypeSupported = (type: string) => type.startsWith('audio/webm');
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };

function chat(overrides: Partial<CustomerChatDetail> = {}): CustomerChatDetail {
  return {
    id: 'c1',
    channelId: 'ch1',
    channelType: 'Instagram',
    channelName: 'my_shop',
    contactName: 'Нилуфар',
    contactAvatarUrl: null,
    contactUsername: 'nilufar',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    windowExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    createdAt: new Date().toISOString(),
    canSend: true,
    channelNeedsReconnect: false,
    ...overrides,
  };
}

function renderComposer(detail = chat()) {
  const client = makeQueryClient();
  const view = (d: CustomerChatDetail) => (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ChatComposer chat={d} />
      </QueryClientProvider>
    </MemoryRouter>
  );
  const result = render(view(detail));
  return { ...result, rerenderWith: (d: CustomerChatDetail) => result.rerender(view(d)) };
}

describe('ChatComposer — voice notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [track] })) },
      configurable: true,
    });
    vi.mocked(customerChatsApi.sendVoiceNote).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers the microphone while nothing is typed, and the send button once something is', async () => {
    const user = userEvent.setup();
    renderComposer();

    expect(screen.getByRole('button', { name: 'chats.voice.record' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'chats.send' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'chats.placeholder' }), 'Салом');
    expect(screen.getByRole('button', { name: 'chats.send' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'chats.voice.record' })).not.toBeInTheDocument();
  });

  it('records and sends a voice note into this chat', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: 'chats.voice.record' }));
    expect(await screen.findByRole('status')).toHaveTextContent('chats.voice.recording');
    await user.click(screen.getByRole('button', { name: 'chats.voice.send' }));

    await waitFor(() => expect(customerChatsApi.sendVoiceNote).toHaveBeenCalledTimes(1));
    const [chatId, file] = vi.mocked(customerChatsApi.sendVoiceNote).mock.calls[0];
    expect(chatId).toBe('c1');
    expect([file.type, file.name.endsWith('.webm')]).toEqual(['audio/webm', true]);
    expect(customerChatsApi.sendMedia).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });

  it('a cancelled recording is never sent', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: 'chats.voice.record' }));
    await user.click(await screen.findByRole('button', { name: 'chats.voice.cancel' }));

    expect(customerChatsApi.sendVoiceNote).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'chats.voice.record' })).toBeInTheDocument();
  });

  it('says why when the microphone is not allowed', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn(() => Promise.reject(new Error('denied'))) },
      configurable: true,
    });
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: 'chats.voice.record' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('chats.voice.permission');
  });

  it('no microphone when replying is not possible', () => {
    renderComposer(chat({ canSend: false }));
    expect(screen.queryByRole('button', { name: 'chats.voice.record' })).not.toBeInTheDocument();
  });

  it('when replying stops being possible mid-recording, the recording is thrown away', async () => {
    const user = userEvent.setup();
    const { rerenderWith } = renderComposer();
    await user.click(screen.getByRole('button', { name: 'chats.voice.record' }));
    await screen.findByRole('status');

    rerenderWith(chat({ windowExpiresAt: new Date(Date.now() - 1000).toISOString() }));

    await waitFor(() => expect(track.stop).toHaveBeenCalled());
    expect(customerChatsApi.sendVoiceNote).not.toHaveBeenCalled();
  });
});
