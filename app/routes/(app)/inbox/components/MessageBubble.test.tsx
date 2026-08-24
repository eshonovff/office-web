import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import type { Message } from '~/types/message';
import { formatBytes, formatDownloadProgress } from '../formatMediaSize';
import { useGatedMediaDownload, useMessageBlobUrl } from '../useMessageBlobUrl';
import { MessageBubble } from './MessageBubble';

vi.mock('../useMessageBlobUrl', () => ({
  getMessageObjectUrl: vi.fn(),
  useMessageBlobUrl: vi.fn(() => ({ objectUrl: null, status: 'idle', retry: vi.fn() })),
  useGatedMediaDownload: vi.fn(() => ({ objectUrl: null, status: 'idle', progress: null, start: vi.fn(), cancel: vi.fn(), retry: vi.fn() })),
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
  externalContentUrl: null,
  externalContentKind: null,
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

  it('shows an open-in-Instagram link for a shared Reel instead of a player — there is never real media to download for these', () => {
    // The regression this fixes: mediaUrl is null forever for a shared Reel/Post (Instagram only
    // ever gives a web permalink, confirmed live) — the normal Video path would show an eternal
    // "still downloading" spinner (getServerMediaState treats null mediaUrl + no error as
    // 'pending'). No player, no download button, no pending state — just the link. The permalink
    // comes from the dedicated externalContentUrl field, not parsed out of body text (an earlier
    // version embedded it in body, and the button ended up pointing at the wrong place).
    renderBubble({
      ...baseMessage,
      type: 'Video',
      body: '[Reel] Cool clip',
      externalContentUrl: 'https://www.instagram.com/reel/abc/',
      externalContentKind: 'Reel',
      waveformPeaks: null,
    });

    expect(screen.getByText('messengerContent.reel')).toBeInTheDocument();
    expect(screen.getByText('Cool clip')).toBeInTheDocument();
    const link = screen.getByText('messengerContent.openInInstagram').closest('a');
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/reel/abc/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByTestId('video-message')).not.toBeInTheDocument();
    expect(screen.queryByText('mediaPending')).not.toBeInTheDocument();
  });

  it('badges a shared Post distinctly from a Reel, and shows the real player plus an open-in-Instagram link', () => {
    // Unlike a Reel, a Post's url turned out to be a real downloadable CDN asset (confirmed live
    // 2026-08-25) — so a Post gets the normal player (proven by MediaDownloadJob succeeding on
    // one), badged, with the permalink offered as a bonus link, not instead of the player.
    renderBubble({
      ...baseMessage,
      type: 'Video',
      body: '[Post] Sunset',
      externalContentUrl: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1',
      externalContentKind: 'Post',
      waveformPeaks: null,
    });

    expect(screen.getByText('messengerContent.post')).toBeInTheDocument();
    expect(screen.queryByText('messengerContent.reel')).not.toBeInTheDocument();
    expect(screen.getByTestId('video-message')).toBeInTheDocument();
    expect(screen.getByText('Sunset')).toBeInTheDocument();
    expect(screen.getByText('messengerContent.openInInstagram').closest('a')).toHaveAttribute(
      'href',
      'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1'
    );
  });

  it('does not badge a plain video as a Reel', () => {
    renderBubble({ ...baseMessage, type: 'Video', body: null, waveformPeaks: null });

    expect(screen.queryByText('messengerContent.reel')).not.toBeInTheDocument();
  });

  it('shows a reply to a story as context plus the reply text, badged distinctly as a Story', () => {
    renderBubble({ ...baseMessage, type: 'StoryReply', body: 'nice story!', waveformPeaks: null });

    expect(screen.getByText('messengerContent.story')).toBeInTheDocument();
    expect(screen.getByText('messengerContent.storyReplyContext')).toBeInTheDocument();
    expect(screen.getByText('nice story!')).toBeInTheDocument();
  });

  it('shows a story mention distinctly from a story reply — no reply text exists for a mention', () => {
    renderBubble({ ...baseMessage, type: 'StoryReply', body: null, waveformPeaks: null });

    expect(screen.getByText('messengerContent.storyMention')).toBeInTheDocument();
    expect(screen.queryByText('messengerContent.storyReplyContext')).not.toBeInTheDocument();
  });

  it('never shows a broken preview for a story reply — no player, no pending spinner, since Instagram gives no downloadable media for these either', () => {
    // Same root cause as Reel/Post: the backend never enqueues a download for a story's url
    // (also just a permalink, and one that dies within ~24h besides) — mediaUrl stays null
    // forever, so the old preview-image chip would sit in an eternal pending spinner.
    renderBubble({ ...baseMessage, type: 'StoryReply', body: 'nice story!', waveformPeaks: null });

    expect(screen.queryByText('mediaPending')).not.toBeInTheDocument();
    expect(screen.getByText('messengerContent.storyMayBeGone')).toBeInTheDocument();
  });

  it('shows an open-in-Instagram link for a story reply when the webhook carried a permalink', () => {
    renderBubble({
      ...baseMessage,
      type: 'StoryReply',
      body: 'nice story!',
      externalContentUrl: 'https://www.instagram.com/stories/customer/123/',
      externalContentKind: 'Story',
      waveformPeaks: null,
    });

    const link = screen.getByText('messengerContent.openInInstagram').closest('a');
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/stories/customer/123/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('messengerContent.storyMayBeGone')).toBeInTheDocument();
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

  it('shows the server-reported reason but no retry button for a permanently failed download', () => {
    // MediaDownloadJob already gave up for good here (e.g. an expired CDN url) — mediaUnavailable
    // means the gated hook is never even given a real path to fetch, so a retry button would be a
    // dead end that looks actionable but silently does nothing. See mediaAvailability.ts's 'failed' state.
    vi.mocked(useGatedMediaDownload).mockReturnValue({ objectUrl: null, status: 'idle', progress: null, start: vi.fn(), cancel: vi.fn(), retry: vi.fn() });

    renderBubble({ ...baseMessage, type: 'Audio', mediaDownloadError: 'Instagram: token expired' });

    expect(screen.getByText('Instagram: token expired')).toBeInTheDocument();
    expect(screen.queryByText('retry')).not.toBeInTheDocument();
  });

  it('offers a retry button for a browser-side fetch failure too, distinct from the pending/deleted states', async () => {
    const retry = vi.fn();
    vi.mocked(useGatedMediaDownload).mockReturnValue({ objectUrl: null, status: 'error', progress: null, start: vi.fn(), cancel: vi.fn(), retry });
    const user = userEvent.setup();

    renderBubble({ ...baseMessage, type: 'Audio' });

    expect(screen.getByText('mediaLoadFailed')).toBeInTheDocument();
    await user.click(screen.getByText('retry'));
    expect(retry).toHaveBeenCalled();
  });

  it('surfaces a video that fetched successfully but will not decode/play, instead of a silent black box', () => {
    vi.mocked(useGatedMediaDownload).mockReturnValue({ objectUrl: 'blob:video', status: 'ready', progress: null, start: vi.fn(), cancel: vi.fn(), retry: vi.fn() });
    const { container } = renderBubble({ ...baseMessage, type: 'Video' });

    const video = container.querySelector('video')!;
    fireEvent.error(video);

    expect(screen.getByTestId('video-playback-error')).toBeInTheDocument();
    expect(screen.getByText('videoPlaybackFailed')).toBeInTheDocument();
    expect(screen.getByText('retry')).toBeInTheDocument();
  });

  it('surfaces an audio file that fetched successfully but will not decode/play', () => {
    vi.mocked(useGatedMediaDownload).mockReturnValue({ objectUrl: 'blob:audio', status: 'ready', progress: null, start: vi.fn(), cancel: vi.fn(), retry: vi.fn() });
    const { container } = renderBubble({ ...baseMessage, type: 'Audio' });

    const audio = container.querySelector('audio')!;
    fireEvent.error(audio);

    expect(screen.getByText('mediaLoadFailed')).toBeInTheDocument();
  });

  it('shows a download button and size for video before the browser has fetched it, and starts the download on tap', async () => {
    const start = vi.fn();
    vi.mocked(useGatedMediaDownload).mockReturnValue({ objectUrl: null, status: 'idle', progress: null, start, cancel: vi.fn(), retry: vi.fn() });
    const user = userEvent.setup();

    renderBubble({ ...baseMessage, type: 'Video', sizeBytes: 5_000_000, waveformPeaks: null });

    expect(screen.getByText(formatBytes(5_000_000))).toBeInTheDocument();
    await user.click(screen.getByTestId('video-play-button'));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('shows loaded/total progress and offers cancel while a video is downloading', async () => {
    const cancel = vi.fn();
    vi.mocked(useGatedMediaDownload).mockReturnValue({
      objectUrl: null,
      status: 'downloading',
      progress: { loaded: 2 * 1024 * 1024, total: 5_000_000 },
      start: vi.fn(),
      cancel,
      retry: vi.fn(),
    });
    const user = userEvent.setup();

    renderBubble({ ...baseMessage, type: 'Video', waveformPeaks: null });

    expect(screen.getByText(formatDownloadProgress(2 * 1024 * 1024, 5_000_000))).toBeInTheDocument();
    await user.click(screen.getByTestId('video-play-button'));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
