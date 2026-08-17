import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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
  useMessageBlobUrl: vi.fn(() => ({ objectUrl: null, status: 'idle' })),
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
    expect(screen.getByText('mediaDownloadFailed')).toBeInTheDocument();
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
