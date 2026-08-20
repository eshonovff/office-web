import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { channelsApi } from '~/api/channels';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import { useAuthStore } from '~/store/useAuthStore';
import type { ConversationDetail } from '~/types/conversation';
import { useInboxBreakpoint } from '../useInboxBreakpoint';
import { autoResizeTextarea, Composer, computeTextareaMaxHeight } from './Composer';

vi.mock('~/api/conversations', () => ({
  conversationsApi: { sendMessage: vi.fn(), takeover: vi.fn() },
}));
vi.mock('~/api/channels', () => ({
  channelsApi: { listWhatsAppTemplates: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../useInboxBreakpoint', () => ({ useInboxBreakpoint: vi.fn().mockReturnValue('desktop') }));

// jsdom has no real object-URL support — only needed for the accepted-file
// path (handleFileChange builds a local preview for image/video/audio).
URL.createObjectURL = vi.fn(() => 'blob:mock');
URL.revokeObjectURL = vi.fn();

function makeConversation(overrides: Partial<ConversationDetail> = {}): ConversationDetail {
  return {
    id: 'c1',
    channelId: 'ch1',
    channelType: 'WhatsApp',
    channelName: 'Test WA',
    externalId: '992900000001',
    contactName: 'Далер',
    contactAvatarUrl: null,
    status: 'New',
    assignedTo: null,
    assignedToName: null,
    lastMessageAt: null,
    unreadCount: 0,
    windowExpiresAt: null,
    createdAt: new Date().toISOString(),
    mediaLimits: [
      { category: 'image', maxSizeBytes: 5 * 1024 * 1024 },
      { category: 'audioVideo', maxSizeBytes: 16 * 1024 * 1024 },
      { category: 'document', maxSizeBytes: 100 * 1024 * 1024 },
    ],
    ...overrides,
  };
}

function renderComposer(conversation: ConversationDetail) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Composer conversation={conversation} />
    </QueryClientProvider>
  );
}

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks resets call history but not a prior mockReturnValue — the
    // 'send button label' tests below switch this to 'mobile'; without
    // resetting it here that leaks into every test that runs after them.
    vi.mocked(useInboxBreakpoint).mockReturnValue('desktop');
    useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });
  });

  it('sends free text when the window is open', async () => {
    vi.mocked(conversationsApi.sendMessage).mockResolvedValue({} as any);
    const user = userEvent.setup();

    renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

    await user.type(screen.getByPlaceholderText('composerPlaceholder'), 'Салом!');
    await user.click(screen.getByText('send'));

    await waitFor(() => {
      expect(conversationsApi.sendMessage).toHaveBeenCalledWith('c1', { body: 'Салом!', isInternalNote: false });
    });
  });

  it('blocks free text and asks a channels.manage holder to pick a template when the window is closed', async () => {
    useAuthStore.setState({ permissions: ['channels.manage'] });
    vi.mocked(channelsApi.listWhatsAppTemplates).mockResolvedValue([
      { name: 'welcome', language: 'tg', status: 'APPROVED', bodyText: 'Салом!' },
    ]);

    renderComposer(makeConversation({ windowExpiresAt: dayjs().subtract(1, 'hour').toISOString() }));

    expect(screen.getByText('windowClosedTitle')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('composerPlaceholder')).not.toBeInTheDocument();
    await waitFor(() => expect(channelsApi.listWhatsAppTemplates).toHaveBeenCalledWith('ch1'));
  });

  it('tells a user without channels.manage to ask an admin, without fetching templates', () => {
    renderComposer(makeConversation({ windowExpiresAt: dayjs().subtract(1, 'hour').toISOString() }));

    expect(screen.getByText('templatesUnavailable')).toBeInTheDocument();
    expect(channelsApi.listWhatsAppTemplates).not.toHaveBeenCalled();
  });

  it('treats a missing windowExpiresAt as closed', () => {
    renderComposer(makeConversation({ windowExpiresAt: null }));
    expect(screen.getByText('windowClosedTitle')).toBeInTheDocument();
  });

  it('switches to the template flow when send comes back with a 409 mid-send', async () => {
    vi.mocked(conversationsApi.sendMessage).mockRejectedValue({ response: { status: 409 } });
    const user = userEvent.setup();

    renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

    await user.type(screen.getByPlaceholderText('composerPlaceholder'), 'Салом!');
    await user.click(screen.getByText('send'));

    await waitFor(() => expect(screen.getByText('windowClosedDuringSend')).toBeInTheDocument());
  });

  it('invalidates conversation queries broadly on a successful send, so a claim-on-reply shows up without a manual refresh (item 2)', async () => {
    vi.mocked(conversationsApi.sendMessage).mockResolvedValue({} as any);
    const user = userEvent.setup();
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <Composer conversation={makeConversation({ assignedTo: null, windowExpiresAt: dayjs().add(6, 'hour').toISOString() })} />
      </QueryClientProvider>
    );

    await user.type(screen.getByPlaceholderText('composerPlaceholder'), 'Салом!');
    await user.click(screen.getByText('send'));

    // The backend claims an unassigned conversation on its first reply before
    // returning — this broad invalidation (not just the messages list) is what
    // makes the new assignee reach the conversation list row and context panel
    // for the sender's own tab; other operators' tabs get it via the
    // ConversationAssigned realtime event instead (see useInboxRealtime.test.tsx).
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['conversations'], exact: false }));
  });

  describe('read-only when not the assignee', () => {
    it('disables the composer and offers takeover when assigned to someone else', () => {
      useAuthStore.setState({ user: { id: 'me' } as any, roles: [] });
      renderComposer(makeConversation({ assignedTo: 'other-user', assignedToName: 'Далер' }));

      expect(screen.queryByPlaceholderText('composerPlaceholder')).not.toBeInTheDocument();
      expect(screen.getByText('readOnlyTitle')).toBeInTheDocument();
      expect(screen.getByText('readOnlyOwnedBy')).toBeInTheDocument();
      expect(screen.getByText('takeOver')).toBeInTheDocument();
    });

    it('stays usable when the conversation is unassigned', () => {
      useAuthStore.setState({ user: { id: 'me' } as any, roles: [] });
      renderComposer(makeConversation({ assignedTo: null, windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

      expect(screen.getByPlaceholderText('composerPlaceholder')).toBeInTheDocument();
    });

    it('stays usable when the caller is the assignee', () => {
      useAuthStore.setState({ user: { id: 'me' } as any, roles: [] });
      renderComposer(
        makeConversation({ assignedTo: 'me', windowExpiresAt: dayjs().add(6, 'hour').toISOString() })
      );

      expect(screen.getByPlaceholderText('composerPlaceholder')).toBeInTheDocument();
    });

    it('lets Owner/Admin send on a chat assigned to someone else', () => {
      useAuthStore.setState({ user: { id: 'me' } as any, roles: ['owner'] });
      renderComposer(
        makeConversation({
          assignedTo: 'other-user',
          assignedToName: 'Далер',
          windowExpiresAt: dayjs().add(6, 'hour').toISOString(),
        })
      );

      expect(screen.getByPlaceholderText('composerPlaceholder')).toBeInTheDocument();
    });

    it('takes over the conversation and reports success', async () => {
      useAuthStore.setState({ user: { id: 'me' } as any, roles: [] });
      vi.mocked(conversationsApi.takeover).mockResolvedValue(
        makeConversation({ assignedTo: 'me', assignedToName: 'Me' })
      );
      const user = userEvent.setup();

      renderComposer(makeConversation({ assignedTo: 'other-user', assignedToName: 'Далер' }));
      await user.click(screen.getByText('takeOver'));

      await waitFor(() => expect(conversationsApi.takeover).toHaveBeenCalledWith('c1'));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('takeoverSuccess'));
    });

    it('reports takeover failure honestly instead of pretending it worked', async () => {
      useAuthStore.setState({ user: { id: 'me' } as any, roles: [] });
      vi.mocked(conversationsApi.takeover).mockRejectedValue(new Error('boom'));
      const user = userEvent.setup();

      renderComposer(makeConversation({ assignedTo: 'other-user', assignedToName: 'Далер' }));
      await user.click(screen.getByText('takeOver'));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('takeoverFailed'));
      expect(screen.getByText('readOnlyTitle')).toBeInTheDocument();
    });
  });

  describe('internal notes (item 4)', () => {
    it('sends as a normal reply when the toggle is off', async () => {
      vi.mocked(conversationsApi.sendMessage).mockResolvedValue({} as any);
      const user = userEvent.setup();

      renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));
      await user.type(screen.getByPlaceholderText('composerPlaceholder'), 'Салом!');
      await user.click(screen.getByRole('button', { name: 'send' }));

      await waitFor(() =>
        expect(conversationsApi.sendMessage).toHaveBeenCalledWith('c1', { body: 'Салом!', isInternalNote: false })
      );
    });

    it('sends isInternalNote: true and swaps in the note placeholder/send label once toggled on', async () => {
      vi.mocked(conversationsApi.sendMessage).mockResolvedValue({} as any);
      const user = userEvent.setup();

      renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));
      await user.click(screen.getByRole('switch'));

      expect(screen.getByPlaceholderText('internalNotePlaceholder')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'sendNote' })).toBeInTheDocument();

      await user.type(screen.getByPlaceholderText('internalNotePlaceholder'), 'Позвонить завтра');
      await user.click(screen.getByRole('button', { name: 'sendNote' }));

      await waitFor(() =>
        expect(conversationsApi.sendMessage).toHaveBeenCalledWith('c1', { body: 'Позвонить завтра', isInternalNote: true })
      );
    });

    it('hides attach and voice-record while in note mode — notes are text-only on the backend', async () => {
      const user = userEvent.setup();
      renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

      // Before: paperclip, mic, send. After: send only.
      expect(screen.getAllByRole('button')).toHaveLength(3);

      await user.click(screen.getByRole('switch'));

      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('lets you write a note even when the WhatsApp window is closed, bypassing the template requirement', async () => {
      renderComposer(makeConversation({ windowExpiresAt: dayjs().subtract(1, 'hour').toISOString() }));
      expect(screen.getByText('windowClosedTitle')).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByRole('switch'));

      expect(screen.queryByText('windowClosedTitle')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('internalNotePlaceholder')).toBeInTheDocument();
    });
  });

  describe('voice recording', () => {
    let resolveGetUserMedia: (stream: MediaStream) => void;

    beforeEach(() => {
      let recorderState: 'inactive' | 'recording' = 'inactive';
      const fakeRecorder = {
        ondataavailable: null as ((e: { data: { size: number } }) => void) | null,
        onstop: null as (() => void) | null,
        get state() {
          return recorderState;
        },
        start: vi.fn(() => {
          recorderState = 'recording';
        }),
        stop: vi.fn(() => {
          recorderState = 'inactive';
          fakeRecorder.onstop?.();
        }),
      };

      vi.stubGlobal('MediaRecorder', function MediaRecorder() {
        return fakeRecorder;
      });
      (globalThis.MediaRecorder as unknown as { isTypeSupported: () => boolean }).isTypeSupported = () => true;

      const getUserMedia = vi.fn(
        () =>
          new Promise<MediaStream>((resolve) => {
            resolveGetUserMedia = resolve;
          })
      );
      vi.stubGlobal('navigator', {
        ...navigator,
        mediaDevices: { getUserMedia },
      });
    });

    it('does not start a second recording from a rapid double tap while getUserMedia is still pending', async () => {
      const user = userEvent.setup();
      renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));
      const micButton = screen.getAllByRole('button')[1];

      await user.click(micButton);
      await user.click(micButton);
      resolveGetUserMedia!({ getTracks: () => [] } as unknown as MediaStream);

      await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1));
    });
  });

  describe('send button label', () => {
    it('shows the text label alongside the icon on tablet/desktop', () => {
      vi.mocked(useInboxBreakpoint).mockReturnValue('desktop');
      renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

      expect(screen.getByText('send')).toBeInTheDocument();
    });

    it('is icon-only (with an accessible label) on mobile', () => {
      vi.mocked(useInboxBreakpoint).mockReturnValue('mobile');
      renderComposer(makeConversation({ windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

      expect(screen.queryByText('send')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'send' })).toBeInTheDocument();
    });
  });

  describe('file size limits, read from the conversation instead of a hardcoded copy (item 4)', () => {
    function fileInput(container: HTMLElement) {
      return container.querySelector('input[type="file"]') as HTMLInputElement;
    }

    it('rejects a file over WhatsApp\'s 5MB image limit', async () => {
      const user = userEvent.setup();
      const { container } = renderComposer(
        makeConversation({
          channelType: 'WhatsApp',
          windowExpiresAt: dayjs().add(6, 'hour').toISOString(),
          mediaLimits: [{ category: 'image', maxSizeBytes: 5 * 1024 * 1024 }],
        })
      );
      const oversized = new File([new Uint8Array(6 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput(container), oversized);

      expect(screen.getByText('fileTooLarge')).toBeInTheDocument();
    });

    it('accepts the same file size on Instagram, since Messenger Platform allows up to 25MB per attachment', async () => {
      const user = userEvent.setup();
      const { container } = renderComposer(
        makeConversation({
          channelType: 'Instagram',
          windowExpiresAt: dayjs().add(6, 'hour').toISOString(),
          mediaLimits: [
            { category: 'image', maxSizeBytes: 25 * 1024 * 1024 },
            { category: 'audioVideo', maxSizeBytes: 25 * 1024 * 1024 },
            { category: 'document', maxSizeBytes: 25 * 1024 * 1024 },
          ],
        })
      );
      const sixMb = new File([new Uint8Array(6 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput(container), sixMb);

      expect(screen.queryByText('fileTooLarge')).not.toBeInTheDocument();
    });
  });
});

describe('Composer Messenger Platform window (item 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });
  });

  it('shows the normal composer and no special note while the 24h window is still open', () => {
    renderComposer(makeConversation({ channelType: 'Instagram', windowExpiresAt: dayjs().add(6, 'hour').toISOString() }));

    expect(screen.getByPlaceholderText('composerPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('messengerTagActive')).not.toBeInTheDocument();
    expect(screen.queryByText('windowClosedTitle')).not.toBeInTheDocument();
  });

  it('never shows the WhatsApp template picker for Instagram/Facebook — they have no templates', () => {
    renderComposer(makeConversation({ channelType: 'Instagram', windowExpiresAt: dayjs().subtract(1, 'hour').toISOString() }));

    expect(screen.queryByText('windowClosedTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('selectTemplate')).not.toBeInTheDocument();
  });

  it('stays fully usable and explains the HUMAN_AGENT tag once the 24h window has closed but is within 7 days', () => {
    renderComposer(makeConversation({ channelType: 'Instagram', windowExpiresAt: dayjs().subtract(1, 'hour').toISOString() }));

    expect(screen.getByText('messengerTagActive')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('composerPlaceholder')).toBeInTheDocument();
  });

  it('blocks sending outright once more than 7 days have passed since the last inbound message', () => {
    renderComposer(makeConversation({ channelType: 'Facebook', windowExpiresAt: dayjs().subtract(8, 'day').toISOString() }));

    expect(screen.getByText('messengerWindowClosedTitle')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('composerPlaceholder')).not.toBeInTheDocument();
  });

  it('lets an internal note through even when replying to the customer would be blocked', async () => {
    const user = userEvent.setup();
    renderComposer(makeConversation({ channelType: 'Facebook', windowExpiresAt: dayjs().subtract(8, 'day').toISOString() }));

    expect(screen.getByText('messengerWindowClosedTitle')).toBeInTheDocument();

    await user.click(screen.getByRole('switch'));

    expect(screen.queryByText('messengerWindowClosedTitle')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('internalNotePlaceholder')).toBeInTheDocument();
  });

  it('does not apply the Messenger 7-day block to WhatsApp — that channel always keeps the template option instead', () => {
    renderComposer(makeConversation({ channelType: 'WhatsApp', windowExpiresAt: dayjs().subtract(8, 'day').toISOString() }));

    expect(screen.queryByText('messengerWindowClosedTitle')).not.toBeInTheDocument();
    expect(screen.getByText('windowClosedTitle')).toBeInTheDocument();
  });
});

describe('computeTextareaMaxHeight', () => {
  it('is line height times max lines plus vertical padding and border', () => {
    expect(computeTextareaMaxHeight(20, 16, 2, 4)).toBe(20 * 4 + 16 + 2);
  });
});

describe('autoResizeTextarea', () => {
  function makeTextarea(scrollHeight: number) {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
    return el;
  }

  it('grows to fit content up to the max-lines cap, hiding overflow while under it', () => {
    const el = makeTextarea(40);
    autoResizeTextarea(el, 6);
    expect(el.style.height).toBe('40px');
    expect(el.style.overflowY).toBe('hidden');
  });

  it('caps the height and scrolls once content exceeds the max-lines cap', () => {
    const el = makeTextarea(500);
    autoResizeTextarea(el, 4);
    expect(parseFloat(el.style.height)).toBeLessThan(500);
    expect(el.style.overflowY).toBe('auto');
  });

  it('shrinks back down when content is cleared (e.g. right after sending)', () => {
    const el = makeTextarea(500);
    autoResizeTextarea(el, 4);
    const grownHeight = parseFloat(el.style.height);

    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 20 });
    autoResizeTextarea(el, 4);

    expect(parseFloat(el.style.height)).toBeLessThan(grownHeight);
    expect(el.style.overflowY).toBe('hidden');
  });
});
