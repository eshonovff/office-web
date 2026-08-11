import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '~/types/message';
import { MessageBubble } from './MessageBubble';

vi.mock('../useMessageBlobUrl', () => ({
  getMessageObjectUrl: vi.fn(),
  useMessageBlobUrl: vi.fn(() => ({ objectUrl: null, status: 'idle' })),
}));

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
};

describe('MessageBubble media rendering', () => {
  it('keeps the waveform visible after retention deletes the stored voice file', () => {
    render(<MessageBubble message={{ ...baseMessage, mediaDeletedAt: '2026-08-11T07:00:00Z' }} />);

    expect(screen.getByTestId('voice-note-player')).toBeInTheDocument();
    expect(screen.getAllByTestId('voice-wave-bar')).toHaveLength(3);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('mediaGone')).toBeInTheDocument();
  });
});
