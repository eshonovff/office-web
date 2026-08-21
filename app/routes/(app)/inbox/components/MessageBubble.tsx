import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Check,
  CheckCheck,
  Clapperboard,
  Clock,
  Contact,
  Download,
  FileText,
  Image,
  Loader2,
  MapPin,
  Paperclip,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { conversationsApi } from '~/api/conversations';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { Message, MessageType } from '~/types/message';
import { getServerMediaState } from '../mediaAvailability';
import { classifyMessengerContent } from '../messengerContent';
import { getMessageObjectUrl, useMessageBlobUrl } from '../useMessageBlobUrl';
import { ImageLightbox } from './ImageLightbox';
import { VideoMessage } from './VideoMessage';
import { VoiceNotePlayer } from './VoiceNotePlayer';

const MEDIA_ICON: Partial<Record<MessageType, typeof Image>> = {
  Image: Image,
  Video: Paperclip,
  Audio: Paperclip,
  File: FileText,
  StoryReply: Image,
  Location: MapPin,
  Contact: Contact,
};

// Mirrors the backend config (Inbox:DelayedSendSeconds, appsettings.json) —
// no endpoint exposes the configured value, so the countdown is best-effort
// display only. The actual deadline is enforced server-side; this just
// gives the operator a sense of how long the Cancel button is likely to
// still work.
const DELAYED_SEND_SECONDS = 15;

function DeliveryStatusIcon({ status }: { status: Message['deliveryStatus'] }) {
  switch (status) {
    case 'Pending':
      return <Clock className="h-3 w-3" />;
    case 'Sent':
      return <Check className="h-3 w-3" />;
    case 'Delivered':
      return <CheckCheck className="h-3 w-3" />;
    case 'Read':
      return <CheckCheck className="text-primary h-3 w-3" />;
    case 'Failed':
      return <AlertCircle className="text-destructive h-3 w-3" />;
    case 'Cancelled':
      return <Ban className="h-3 w-3 opacity-70" />;
  }
}

function usePendingCountdown(createdAt: string): number {
  const target = useMemo(() => dayjs(createdAt).add(DELAYED_SEND_SECONDS, 'second'), [createdAt]);
  const [remaining, setRemaining] = useState(() => Math.max(0, target.diff(dayjs(), 'second')));

  useEffect(() => {
    setRemaining(Math.max(0, target.diff(dayjs(), 'second')));
    const interval = window.setInterval(() => setRemaining(Math.max(0, target.diff(dayjs(), 'second'))), 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  return remaining;
}

/**
 * The two honest failure cases from item 5 on the backend: cancelling after
 * the send job already ran gets a 409 here (never a fake success — both
 * sides of that race check the same "still Pending" condition), and once
 * dispatch itself fails the reason is surfaced directly on the message
 * (see the `message.failureReason` block in MessageBubble) rather than here.
 */
function PendingSendControls({ message }: { message: Message }) {
  const { t } = useTranslation('inbox');
  const queryClient = useQueryClient();
  const remaining = usePendingCountdown(message.createdAt);

  const { mutate: cancelSend, isPending: isCancelling } = useMutation({
    mutationFn: () => conversationsApi.cancelMessage(message.conversationId, message.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', message.conversationId, 'messages'] });
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? t('cancelTooLate') : t('cancelFailed'));
      // The job may have already run and changed the real status (Sent/Failed)
      // — refetch so the UI reflects what actually happened, not a stale Pending.
      void queryClient.invalidateQueries({ queryKey: ['conversations', message.conversationId, 'messages'] });
    },
  });

  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      <span className="text-2xs opacity-70">{remaining > 0 ? t('pendingCountdown', { seconds: remaining }) : t('pendingDispatching')}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-5 px-1.5 text-2xs opacity-80"
        disabled={isCancelling}
        onClick={() => cancelSend()}>
        {t('cancelSend')}
      </Button>
    </div>
  );
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function mediaErrorKey(status: ReturnType<typeof useMessageBlobUrl>['status']) {
  if (status === 'gone') return 'mediaGone';
  if (status === 'download-error') return 'mediaDownloadFailed';
  if (status === 'not-found') return 'mediaNotFound';
  if (status === 'error') return 'mediaLoadFailed';
  return null;
}

/**
 * Two layers of state, shown as one line: whether the SERVER has the file at
 * all (getServerMediaState — pending while MediaDownloadJob hasn't finished
 * yet, failed/deleted once it has an answer) and, once it does, whether the
 * BROWSER has fetched those bytes yet (status, from useMessageBlobUrl). A
 * pending message used to show nothing at all here — indistinguishable from
 * a message that will never have media.
 */
function MediaStatus({
  message,
  status,
  onRetry,
}: {
  message: Message;
  status: ReturnType<typeof useMessageBlobUrl>['status'];
  onRetry?: () => void;
}) {
  const { t } = useTranslation('inbox');
  const serverState = getServerMediaState(message);

  if (serverState === 'pending') {
    return (
      <p className="flex items-center gap-1.5 text-2xs opacity-75">
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
        {t('mediaPending')}
      </p>
    );
  }

  if (serverState === 'deleted') {
    return <p className="text-2xs opacity-75">{t('mediaGone')}</p>;
  }

  // message.mediaDownloadError is the server's own reason text (already
  // human-readable, not a translation key) — a browser-side fetch problem
  // (status) is everything else, translated via mediaErrorKey.
  const errorKey = mediaErrorKey(status);
  const errorText = serverState === 'failed' ? message.mediaDownloadError : errorKey ? t(errorKey) : null;
  if (errorText) {
    // serverState === 'failed' means MediaDownloadJob already gave up for good (e.g. an
    // expired CDN url) — mediaUnavailable makes useMessageBlobUrl never even fetch, so retry
    // was a dead button that looked actionable but did nothing. Only offer it for a genuine
    // client-side hiccup, where the server DOES have the file and retrying can actually work.
    const canRetry = onRetry && serverState !== 'failed';
    return (
      <div className="flex items-center gap-1.5 text-2xs opacity-90">
        <AlertCircle className="h-3 w-3 shrink-0" />
        <span className="min-w-0 flex-1">{errorText}</span>
        {canRetry && (
          <Button type="button" variant="ghost" size="sm" className="h-5 shrink-0 px-1.5 text-2xs" onClick={onRetry}>
            {t('retry')}
          </Button>
        )}
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <p className="flex items-center gap-1.5 text-2xs opacity-75">
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
        {t('mediaLoading')}
      </p>
    );
  }

  return null;
}

/** The icon shown inside an empty placeholder box (Image/StoryReply, before there's anything to preview) — reflects the same state MediaStatus describes in words below it. */
function PlaceholderIcon({ message, status }: { message: Message; status: ReturnType<typeof useMessageBlobUrl>['status'] }) {
  const serverState = getServerMediaState(message);
  if (serverState === 'pending' || status === 'loading') return <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />;
  if (serverState === 'failed' || mediaErrorKey(status)) return <AlertCircle className="text-muted-foreground h-5 w-5" />;
  return <Image className="text-muted-foreground h-5 w-5" />;
}

function MessageMedia({ message, isOutbound }: { message: Message; isOutbound: boolean }) {
  const { t } = useTranslation('inbox');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const mediaUnavailable = !!message.mediaDeletedAt || !!message.mediaDownloadError;
  const media = useMessageBlobUrl('media', message.id, mediaUnavailable ? null : message.mediaUrl);
  const thumbnail = useMessageBlobUrl('thumbnail', message.id, message.mediaDownloadError ? null : message.thumbnailUrl);
  const fileName = message.originalFileName || t(`messageType.${message.type}`);
  const meta = formatBytes(message.sizeBytes);

  // The fetch (useMessageBlobUrl) can succeed — a 200 with a real byte
  // stream — while the bytes themselves aren't valid media (an <img>/
  // <video>/<audio> element's own onError, separate from any HTTP status).
  // Reset whenever the underlying blob changes, so a stale error from a
  // previous object URL doesn't linger after a real fix.
  const [imageDecodeError, setImageDecodeError] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const previewSource = thumbnail.objectUrl ?? media.objectUrl;
  useEffect(() => setImageDecodeError(false), [previewSource]);
  useEffect(() => setPlaybackError(false), [media.objectUrl]);

  async function downloadFile() {
    if (!message.mediaUrl || downloadStatus === 'loading') return;
    setDownloadStatus('loading');
    try {
      const objectUrl = await getMessageObjectUrl('media', message.id, message.mediaUrl);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.click();
      setDownloadStatus('idle');
    } catch {
      setDownloadStatus('error');
    }
  }

  if (message.type === 'Image') {
    const combinedStatus = media.status === 'idle' ? thumbnail.status : media.status;
    const previewUrl = imageDecodeError ? null : previewSource;
    return (
      <div className="space-y-1.5">
        {previewUrl ? (
          <button type="button" className="block overflow-hidden rounded-md" onClick={() => media.objectUrl && setLightboxOpen(true)}>
            <img
              src={previewUrl}
              alt={fileName}
              className="max-h-56 max-w-full object-cover"
              onError={() => setImageDecodeError(true)}
            />
          </button>
        ) : (
          <div className="bg-muted flex min-h-24 min-w-48 items-center justify-center rounded-md">
            <PlaceholderIcon message={message} status={combinedStatus} />
          </div>
        )}
        <MediaStatus
          message={message}
          status={imageDecodeError ? 'error' : combinedStatus}
          onRetry={() => {
            setImageDecodeError(false);
            media.retry();
            thumbnail.retry();
          }}
        />
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
        <ImageLightbox open={lightboxOpen} onOpenChange={setLightboxOpen} src={media.objectUrl} alt={fileName} />
      </div>
    );
  }

  // Instagram: either a reply to our story (message.body carries the reply
  // text) or a mention of us in the customer's own story (no text at all) —
  // MessageType.StoryReply covers both, see messengerContent.ts. Either way
  // the story itself is shown small, as CONTEXT for the reply/mention below
  // it, not as the main content the way a real Image message is — without
  // that distinction an operator can't tell what the customer is even
  // replying to (item 2 of the request this was built for).
  if (message.type === 'StoryReply') {
    const content = classifyMessengerContent(message);
    const isMention = content?.kind === 'storyMention';
    const combinedStatus = media.status === 'idle' ? thumbnail.status : media.status;
    const previewUrl = imageDecodeError ? null : previewSource;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-md border border-current/15 p-1.5">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded object-cover"
              onError={() => setImageDecodeError(true)}
            />
          ) : (
            <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded">
              <PlaceholderIcon message={message} status={combinedStatus} />
            </div>
          )}
          <span className="text-2xs opacity-80">{t(isMention ? 'messengerContent.storyMention' : 'messengerContent.storyReplyContext')}</span>
        </div>
        <MediaStatus
          message={message}
          status={imageDecodeError ? 'error' : combinedStatus}
          onRetry={() => {
            setImageDecodeError(false);
            media.retry();
            thumbnail.retry();
          }}
        />
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
      </div>
    );
  }

  if (message.type === 'Audio') {
    const hasWaveform = !!message.waveformPeaks?.length;
    return (
      <div className="space-y-1.5">
        <VoiceNotePlayer
          src={message.mediaDeletedAt ? null : media.objectUrl}
          durationSeconds={message.voiceDurationSeconds}
          peaks={message.waveformPeaks ?? []}
          disabled={!!message.mediaDeletedAt || !!message.mediaDownloadError || playbackError}
          title={hasWaveform ? undefined : (message.originalFileName ?? undefined)}
          onPlaybackError={() => setPlaybackError(true)}
        />
        <MediaStatus
          message={message}
          status={playbackError ? 'error' : media.status}
          onRetry={() => {
            setPlaybackError(false);
            media.retry();
          }}
        />
      </div>
    );
  }

  if (message.type === 'Video') {
    const disabled = !!message.mediaDeletedAt || !!message.mediaDownloadError;
    // A Reel/shared post shared into DM has no MessageType of its own on the
    // backend — it's a Video with a "[Reel] <title>" marker in body (see
    // messengerContent.ts) — without the badge here it's indistinguishable
    // from a regular video attachment.
    const content = classifyMessengerContent(message);
    const reel = content?.kind === 'reel' ? content : null;
    return (
      <div className="space-y-1.5">
        {reel && (
          <Badge variant="outline" className="gap-1 text-2xs">
            <Clapperboard className="h-3 w-3" />
            {t('messengerContent.reel')}
          </Badge>
        )}
        <VideoMessage
          src={disabled ? null : media.objectUrl}
          posterUrl={thumbnail.objectUrl}
          disabled={disabled || playbackError}
          sizeLabel={meta || undefined}
          onPlaybackError={() => setPlaybackError(true)}
        />
        <MediaStatus
          message={message}
          status={playbackError ? 'error' : media.status}
          onRetry={() => {
            setPlaybackError(false);
            media.retry();
          }}
        />
        {reel?.caption && <p className="whitespace-pre-wrap break-words">{reel.caption}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-current/10 p-2">
      <FileText className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        {meta && <p className="text-2xs opacity-70">{meta}</p>}
        <MediaStatus
          message={message}
          status={downloadStatus === 'error' ? 'error' : downloadStatus === 'loading' ? 'loading' : 'idle'}
          onRetry={downloadFile}
        />
      </div>
      <Button
        type="button"
        variant={isOutbound ? 'secondary' : 'outline'}
        size="icon-sm"
        disabled={!message.mediaUrl || !!message.mediaDeletedAt || !!message.mediaDownloadError || downloadStatus === 'loading'}
        onClick={downloadFile}>
        {downloadStatus === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation('inbox');
  const isOutbound = message.direction === 'Outbound';
  const MediaIcon = message.type !== 'Text' ? MEDIA_ICON[message.type] : undefined;
  // Instagram/Facebook stickers, reactions and unsupported-attachment
  // markers all arrive as MessageType.Text with a recognizable body — see
  // messengerContent.ts. A plain-text message classifies as null here and
  // falls through to the ordinary text bubble below, untouched.
  const textContent = message.type === 'Text' ? classifyMessengerContent(message) : null;

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] space-y-1 rounded-lg px-3 py-2 text-sm',
          message.isInternalNote
            ? 'bg-warning/10 border-warning/30 border'
            : isOutbound
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border'
        )}>
        {message.isInternalNote && (
          <p className="text-warning text-2xs font-semibold">{t('internalNote')}</p>
        )}
        {isOutbound && message.sentByUserName && (
          <p className="text-2xs opacity-70">{message.sentByUserName}</p>
        )}

        {MediaIcon && <MessageMedia message={message} isOutbound={isOutbound} />}

        {message.type === 'Text' && message.body && (
          <>
            {textContent?.kind === 'stickerHeart' && <p className="text-3xl leading-none">❤️</p>}
            {textContent?.kind === 'reaction' && (
              <p className="text-2xs italic opacity-80">{t('messengerContent.reaction', { emoji: textContent.emoji })}</p>
            )}
            {textContent?.kind === 'reactionRemoved' && <p className="text-2xs italic opacity-80">{t('messengerContent.reactionRemoved')}</p>}
            {textContent?.kind === 'unsupportedType' && (
              <div className="flex items-center gap-1.5 text-2xs italic opacity-80">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {t('messengerContent.unsupportedType', { type: textContent.rawType })}
              </div>
            )}
            {!textContent && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
          </>
        )}

        {message.deliveryStatus === 'Failed' && message.failureReason && (
          <p className="text-destructive text-2xs">{message.failureReason}</p>
        )}
        {message.deliveryStatus === 'Cancelled' && <p className="text-2xs italic opacity-70">{t('messageCancelled')}</p>}
        {isOutbound && message.deliveryStatus === 'Pending' && !message.isInternalNote && (
          <PendingSendControls message={message} />
        )}

        <div className={cn('flex items-center gap-1 text-2xs', isOutbound ? 'justify-end opacity-70' : 'text-muted-foreground')}>
          <span>{formatDate(message.createdAt, true)}</span>
          {isOutbound && <DeliveryStatusIcon status={message.deliveryStatus} />}
        </div>
      </div>
    </div>
  );
}
