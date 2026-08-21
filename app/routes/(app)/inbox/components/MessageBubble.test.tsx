import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import type { Message } from '~/types/message';
import { useMessageBlobUrl } from '../useMessageBlobUrl';
import { MessageBubble } from './MessageBubble';

vi.mock('../useMessageBlobUrl', () => ({
  getMessageObjectUrl: vi.fn(),
  useMessageBlobUrl: vi.fn(() => ({ objectUrl: null, status: 'idle', retry: vi.fn() })),
}));
vi.mock('~/api/conversations', () => ({
  conversationsApi: { cancelMessage: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baseMessage: Message = {
  id: 'message-1',
  conversationId: 'conversation-1',
  direction: 'Inbound',
  type: 'Audio',
  body: null,
  mediaUrl: '/api/messages/message-1/media',
  externalId: 'external-1',
  deliveryStatus: 'Delivered',
  isInternalNote: false,
  sentByUserId: null,
  sentByUserName: null,
  createdAt: '2026-08-11T06:00:00Z',
  mimeType: 'audio/ogg',
  sizeBytes: 1024,
  originalFileName: 'voice.ogg',
  voiceDurationSeconds: 12,
  thumbnailUrl: null,
  mediaDeletedAt: null,
  mediaDownloadError: null,
  waveformPeaks: [0.2, 0.4, 0.8],
  failureReason: null,
};

function renderBubble(message: Message) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MessageBubble message={message} />
    </QueryClientProvider>
  );
}

describe('MessageBubble media rendering', () => {
  it('keeps the waveform visible after retention deletes the stored voice file', () => {
    render(<MessageBubble message={{ ...baseMessage, mediaDeletedAt: '2026-08-11T07:00:00Z' }} />);

    expect(screen.getByTestId('voice-note-player')).toBeInTheDocument();
    expect(screen.getAllByTestId('voice-wave-bar')).toHaveLength(3);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('mediaGone')).toBeInTheDocument();
  });

  it('does not request media or thumbnail when the backend already reported a download error', () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          type: 'Image',
          thumbnailUrl: '/api/messages/message-1/thumbnail',
          mediaDownloadError: 'WhatsApp download failed',
          waveformPeaks: null,
        }}
      />
    );

    expect(vi.mocked(useMessageBlobUrl)).toHaveBeenNthCalledWith(1, 'media', 'message-1', null);
    expect(vi.mocked(useMessageBlobUrl)).toHaveBeenNthCalledWith(2, 'thumbnail', 'message-1', null);
    // The server's own reason text, not the generic mediaDownloadFailed key —
    // see mediaAvailability.ts/getServerMediaState's 'failed' branch.
    expect(screen.getByText('WhatsApp download failed')).toBeInTheDocument();
  });

  it('renders the waveform for backfilled voice notes whose duration is still null', () => {
    render(<MessageBubble message={{ ...baseMessage, voiceDurationSeconds: null }} />);

    expect(screen.getByTestId('voice-note-player')).toBeInTheDocument();
    expect(screen.getAllByTestId('voice-wave-bar')).toHaveLength(3);
    expect(screen.queryByText('messageType.Audio')).not.toBeInTheDocument();
  });

  it('renders a titled flat-progress player for audio attachments with no waveform data', () => {
    render(<MessageBubble message={{ ...baseMessage, waveformPeaks: [], originalFileName: 'track.mp3' }} />);

    expect(screen.getByTestId('voice-note-player')).toBeInTheDocument();
    expect(screen.getByText('track.mp3')).toBeInTheDocument();
    expect(screen.queryByTestId('voice-wave-bar')).not.toBeInTheDocument();
  });

  it('renders a Telegram-style thumbnail with a play overlay for video messages', () => {
    render(<MessageBubble message={{ ...baseMessage, type: 'Video', waveformPeaks: null }} />);

    expect(screen.getByTestId('video-message')).toBeInTheDocument();
    expect(screen.getByTestId('video-play-button')).toBeInTheDocument();
  });
});

describe('MessageBubble delivery status (item 3)', () => {
  const pendingTextMessage: Message = {
    ...baseMessage,
    type: 'Text',
    body: 'Салом!',
    direction: 'Outbound',
    deliveryStatus: 'Pending',
    mediaUrl: null,
    createdAt: new Date().toISOString(),
  };

  it('shows a countdown and a Cancel button for a Pending outbound message', () => {
    renderBubble(pendingTextMessage);

    expect(screen.getByText('pendingCountdown')).toBeInTheDocument();
    expect(screen.getByText('cancelSend')).toBeInTheDocument();
  });

  it('never offers to cancel an internal note — notes are never scheduled for dispatch', () => {
    renderBubble({ ...pendingTextMessage, isInternalNote: true });

    expect(screen.queryByText('cancelSend')).not.toBeInTheDocument();
  });

  it('cancels the pending send and refreshes the thread', async () => {
    vi.mocked(conversationsApi.cancelMessage).mockResolvedValue({ ...pendingTextMessage, deliveryStatus: 'Cancelled' });
    const user = userEvent.setup();

    renderBubble(pendingTextMessage);
    await user.click(screen.getByText('cancelSend'));

    await waitFor(() => expect(conversationsApi.cancelMessage).toHaveBeenCalledWith('conversation-1', 'message-1'));
  });

  it('reports honestly when cancel loses the race to dispatch (409) instead of pretending it worked', async () => {
    vi.mocked(conversationsApi.cancelMessage).mockRejectedValue({ response: { status: 409 } });
    const user = userEvent.setup();

    renderBubble(pendingTextMessage);
    await user.click(screen.getByText('cancelSend'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('cancelTooLate'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('reports a generic cancel failure for anything other than the dispatch race', async () => {
    vi.mocked(conversationsApi.cancelMessage).mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();

    renderBubble(pendingTextMessage);
    await user.click(screen.getByText('cancelSend'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('cancelFailed'));
  });

  it('surfaces the stored failure reason on a Failed message (e.g. the 24h window closing mid-delay)', () => {
    renderBubble({
      ...pendingTextMessage,
      deliveryStatus: 'Failed',
      failureReason: 'Тирезаи 24-соата дар давоми таъхир баста шуд.',
    });

    expect(screen.getByText('Тирезаи 24-соата дар давоми таъхир баста шуд.')).toBeInTheDocument();
  });

  it('labels a Cancelled message distinctly instead of leaving it looking like a normal send', () => {
    renderBubble({ ...pendingTextMessage, deliveryStatus: 'Cancelled' });

    expect(screen.getByText('messageCancelled')).toBeInTheDocument();
    expect(screen.queryByText('cancelSend')).not.toBeInTheDocument();
  });
});

describe('MessageBubble Instagram/Facebook content (item 2)', () => {
  it('badges a Reel distinctly from a regular video, and shows its title as a caption', () => {
    renderBubble({ ...baseMessage, type: 'Video', body: '[Reel] Cool clip', waveformPeaks: null });

    expect(screen.getByText('messengerContent.reel')).toBeInTheDocument();
    expect(screen.getByText('Cool clip')).toBeInTheDocument();
  });

  it('badges a titleless Reel without trying to render an empty caption', () => {
    renderBubble({ ...baseMessage, type: 'Video', body: '[Reel]', waveformPeaks: null });

    expect(screen.getByText('messengerContent.reel')).toBeInTheDocument();
  });

  it('does not badge a plain video as a Reel', () => {
    renderBubble({ ...baseMessage, type: 'Video', body: null, waveformPeaks: null });

    expect(screen.queryByText('messengerContent.reel')).not.toBeInTheDocument();
  });

  it('shows a reply to a story as context (small thumbnail chip) plus the reply text, not as a full-size image', () => {
    renderBubble({ ...baseMessage, type: 'StoryReply', body: 'nice story!', waveformPeaks: null });

    expect(screen.getByText('messengerContent.storyReplyContext')).toBeInTheDocument();
    expect(screen.getByText('nice story!')).toBeInTheDocument();
  });

  it('shows a story mention distinctly from a story reply — no reply text exists for a mention', () => {
    renderBubble({ ...baseMessage, type: 'StoryReply', body: null, waveformPeaks: null });

    expect(screen.getByText('messengerContent.storyMention')).toBeInTheDocument();
    expect(screen.queryByText('messengerContent.storyReplyContext')).not.toBeInTheDocument();
  });

  it('renders the heart sticker as a large emoji, not a text bubble', () => {
    renderBubble({ ...baseMessage, type: 'Text', mediaUrl: null, body: '❤️ (стикер)', waveformPeaks: null });

    expect(screen.getByText('❤️')).toBeInTheDocument();
  });

  it('renders a reaction with its emoji interpolated', () => {
    renderBubble({ ...baseMessage, type: 'Text', mediaUrl: null, body: '[реаксия: ❤]', waveformPeaks: null });

    expect(screen.getByText('messengerContent.reaction')).toBeInTheDocument();
  });

  it('renders a removed reaction distinctly from a new one', () => {
    renderBubble({ ...baseMessage, type: 'Text', mediaUrl: null, body: '[реаксия бардошта шуд]', waveformPeaks: null });

    expect(screen.getByText('messengerContent.reactionRemoved')).toBeInTheDocument();
  });

  it('flags an unrecognized attachment type distinctly instead of showing it as plain, unexplained text', () => {
    renderBubble({ ...baseMessage, type: 'Text', mediaUrl: null, body: '[навъи дастгирӣнашуда: sticker]', waveformPeaks: null });

    expect(screen.getByText('messengerContent.unsupportedType')).toBeInTheDocument();
  });

  it('still renders an ordinary text message as plain text, untouched by any of the marker handling', () => {
    renderBubble({ ...baseMessage, type: 'Text', mediaUrl: null, body: 'Салом, чӣ хел ҳастед?', waveformPeaks: null });

    expect(screen.getByText('Салом, чӣ хел ҳастед?')).toBeInTheDocument();
  });
});

describe('MessageBubble media loading/error states', () => {
  it('shows a distinct "still on the server" state before mediaUrl is populated — not an empty player indistinguishable from "no media"', () => {
    renderBubble({ ...baseMessage, type: 'Video', mediaUrl: null, mediaDeletedAt: null, mediaDownloadError: null });

    expect(screen.getByText('mediaPending')).toBeInTheDocument();
    expect(screen.queryByText('mediaGone')).not.toBeInTheDocument();
  });

  it('shows the server-reported reason plus a retry button for a permanently failed download', async () => {
    const retry = vi.fn();
    vi.mocked(useMessageBlobUrl).mockReturnValue({ objectUrl: null, status: 'idle', retry });
    const user = userEvent.setup();

    renderBubble({ ...baseMessage, type: 'Audio', mediaDownloadError: 'Instagram: token expired' });

    expect(screen.getByText('Instagram: token expired')).toBeInTheDocument();
    await user.click(screen.getByText('retry'));
    expect(retry).toHaveBeenCalled();
  });

  it('offers a retry button for a browser-side fetch failure too, distinct from the pending/deleted states', async () => {
    const retry = vi.fn();
    vi.mocked(useMessageBlobUrl).mockReturnValue({ objectUrl: null, status: 'error', retry });
    const user = userEvent.setup();

    renderBubble({ ...baseMessage, type: 'Audio' });

    expect(screen.getByText('mediaLoadFailed')).toBeInTheDocument();
    await user.click(screen.getByText('retry'));
    expect(retry).toHaveBeenCalled();
  });

  it('surfaces a video that fetched successfully but will not decode/play, instead of a silent black box', () => {
    vi.mocked(useMessageBlobUrl).mockReturnValue({ objectUrl: 'blob:video', status: 'ready', retry: vi.fn() });
    const { container } = renderBubble({ ...baseMessage, type: 'Video' });

    const video = container.querySelector('video')!;
    fireEvent.error(video);

    expect(screen.getByTestId('video-playback-error')).toBeInTheDocument();
    expect(screen.getByText('videoPlaybackFailed')).toBeInTheDocument();
    expect(screen.getByText('retry')).toBeInTheDocument();
  });

  it('surfaces an audio file that fetched successfully but will not decode/play', () => {
    vi.mocked(useMessageBlobUrl).mockReturnValue({ objectUrl: 'blob:audio', status: 'ready', retry: vi.fn() });
    const { container } = renderBubble({ ...baseMessage, type: 'Audio' });

    const audio = container.querySelector('audio')!;
    fireEvent.error(audio);

    expect(screen.getByText('mediaLoadFailed')).toBeInTheDocument();
  });
});
