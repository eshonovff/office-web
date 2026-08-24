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
  ExternalLink,
  FileText,
  Image,
  Loader2,
  MapPin,
  Paperclip,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { conversationsApi } from '~/api/conversations';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { Message, MessageType } from '~/types/message';
import { formatBytes, formatDownloadProgress } from '../formatMediaSize';
import { getServerMediaState } from '../mediaAvailability';
import { classifyMessengerContent } from '../messengerContent';
import { useGatedMediaDownload, useMessageBlobUrl, type GatedMediaStatus } from '../useMessageBlobUrl';
import { DownloadProgressRing } from './DownloadProgressRing';
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

function triggerSaveAs(objectUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
}

/** Union of useMessageBlobUrl's (auto) and useGatedMediaDownload's (manual) status shapes — the two differ only in 'loading' vs 'downloading', both handled below. */
type MediaFetchStatus = ReturnType<typeof useMessageBlobUrl>['status'] | GatedMediaStatus;

function mediaErrorKey(status: MediaFetchStatus) {
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
  progressLabel,
}: {
  message: Message;
  status: MediaFetchStatus;
  onRetry?: () => void;
  /** "3.1 / 12.4 MB" while a gated (manual) download is in flight — takes priority over every other line, since it IS the current state. */
  progressLabel?: string | null;
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

  if (progressLabel) {
    return <p className="text-2xs tabular-nums opacity-75">{progressLabel}</p>;
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
  const mediaUnavailable = !!message.mediaDeletedAt || !!message.mediaDownloadError;
  // Image/StoryReply auto-load (small, previewed inline like Telegram's own chat photos); every
  // other type — Video/Audio/File — is gated behind an explicit Download tap (see the top-level
  // request this was built for: real progress is only possible for OUR OWN server's response,
  // so it's worth showing). Both hooks are always called (rules of hooks) but only one of them
  // ever gets a non-null path for a given message.type, so only one of them ever actually fetches.
  const isEagerPreview = message.type === 'Image' || message.type === 'StoryReply';
  const media = useMessageBlobUrl('media', message.id, isEagerPreview && !mediaUnavailable ? message.mediaUrl : null);
  const gatedMedia = useGatedMediaDownload(message.id, !isEagerPreview && !mediaUnavailable ? message.mediaUrl : null);
  const thumbnail = useMessageBlobUrl('thumbnail', message.id, message.mediaDownloadError ? null : message.thumbnailUrl);
  const fileName = message.originalFileName || t(`messageType.${message.type}`);
  const meta = formatBytes(message.sizeBytes);
  const gatedProgressLabel = gatedMedia.status === 'downloading' && gatedMedia.progress ? formatDownloadProgress(gatedMedia.progress.loaded, gatedMedia.progress.total) : null;

  // The fetch can succeed — a 200 with a real byte stream — while the bytes
  // themselves aren't valid media (an <img>/<video>/<audio> element's own
  // onError, separate from any HTTP status). Reset whenever the underlying
  // blob changes, so a stale error from a previous object URL doesn't linger
  // after a real fix.
  const [imageDecodeError, setImageDecodeError] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const previewSource = thumbnail.objectUrl ?? media.objectUrl;
  useEffect(() => setImageDecodeError(false), [previewSource]);
  useEffect(() => setPlaybackError(false), [gatedMedia.objectUrl]);

  // File has no inline "player" state — once fetched it's handed straight to the browser as a
  // save-as download, same as before this hook existed. The ref guards against re-triggering
  // that save-as on every render once ready (e.g. the cache already had it from an earlier tap);
  // a click while it's ALREADY ready (cache hit) triggers save-as immediately instead, since
  // start() is then a no-op and status/objectUrl never change to re-run the effect.
  const pendingSaveAsRef = useRef(false);
  useEffect(() => {
    if (message.type === 'File' && gatedMedia.status === 'ready' && gatedMedia.objectUrl && pendingSaveAsRef.current) {
      pendingSaveAsRef.current = false;
      triggerSaveAs(gatedMedia.objectUrl, fileName);
    }
  }, [message.type, gatedMedia.status, gatedMedia.objectUrl, fileName]);

  function startFileDownload() {
    if (gatedMedia.status === 'ready' && gatedMedia.objectUrl) {
      triggerSaveAs(gatedMedia.objectUrl, fileName);
      return;
    }
    pendingSaveAsRef.current = true;
    gatedMedia.start();
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
  // Instagram never gives real media for a story reply/mention either — same finding as
  // Reel/Post (payload.url is a web permalink, confirmed live) — and a story permalink itself
  // dies ~24h after the ORIGINAL story, sooner than most operators would think to check it. No
  // preview image is attempted (it would sit in an eternal "pending" spinner, mediaUrl is never
  // populated); instead a Story badge + link + an explicit "may already be gone" caveat.
  if (message.type === 'StoryReply') {
    const content = classifyMessengerContent(message);
    const isMention = content?.kind === 'storyMention';
    const permalink = content?.kind === 'storyReply' || content?.kind === 'storyMention' ? content.permalink : null;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-2xs">
            {t('messengerContent.story')}
          </Badge>
          <span className="text-2xs opacity-80">{t(isMention ? 'messengerContent.storyMention' : 'messengerContent.storyReplyContext')}</span>
        </div>
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
        {permalink ? (
          <div className="space-y-0.5">
            <a
              href={permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-2xs underline underline-offset-2 opacity-80 hover:opacity-100">
              <ExternalLink className="h-3 w-3" />
              {t('messengerContent.openInInstagram')}
            </a>
            <p className="text-2xs opacity-60">{t('messengerContent.storyMayBeGone')}</p>
          </div>
        ) : (
          <p className="text-2xs opacity-60">{t('messengerContent.storyMayBeGone')}</p>
        )}
      </div>
    );
  }

  if (message.type === 'Audio') {
    const hasWaveform = !!message.waveformPeaks?.length;
    const disabled = !!message.mediaDeletedAt || !!message.mediaDownloadError;
    return (
      <div className="space-y-1.5">
        <VoiceNotePlayer
          src={disabled ? null : gatedMedia.objectUrl}
          downloadState={gatedMedia.status === 'downloading' ? 'downloading' : gatedMedia.status === 'ready' ? 'ready' : 'idle'}
          downloadProgress={gatedMedia.progress}
          onStartDownload={gatedMedia.start}
          onCancelDownload={gatedMedia.cancel}
          durationSeconds={message.voiceDurationSeconds}
          peaks={message.waveformPeaks ?? []}
          disabled={disabled || playbackError}
          title={hasWaveform ? undefined : (message.originalFileName ?? undefined)}
          onPlaybackError={() => setPlaybackError(true)}
        />
        <MediaStatus
          message={message}
          status={playbackError ? 'error' : gatedMedia.status}
          progressLabel={gatedProgressLabel}
          onRetry={() => {
            setPlaybackError(false);
            gatedMedia.retry();
          }}
        />
      </div>
    );
  }

  if (message.type === 'Video') {
    // A shared Reel/Post has no MessageType of its own on the backend — it's a Video with a
    // "[Reel]"/"[Post]" marker in body (see messengerContent.ts). Confirmed live 2026-08-24:
    // Instagram only ever gives a web permalink for these, never real media bytes — mediaUrl
    // stays null forever, so the normal gated-download player would sit in an eternal "pending"
    // spinner. Render a link card instead: caption + "open on Instagram", no player.
    const content = classifyMessengerContent(message);
    if (content?.kind === 'sharedPost') {
      return (
        <div className="space-y-1.5">
          <Badge variant="outline" className="gap-1 text-2xs">
            <Clapperboard className="h-3 w-3" />
            {t(content.label === 'reel' ? 'messengerContent.reel' : 'messengerContent.post')}
          </Badge>
          {content.caption && <p className="whitespace-pre-wrap break-words">{content.caption}</p>}
          {content.permalink && (
            <a
              href={content.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-2xs underline underline-offset-2 opacity-80 hover:opacity-100">
              <ExternalLink className="h-3 w-3" />
              {t('messengerContent.openInInstagram')}
            </a>
          )}
        </div>
      );
    }

    const disabled = !!message.mediaDeletedAt || !!message.mediaDownloadError;
    return (
      <div className="space-y-1.5">
        <VideoMessage
          downloadState={gatedMedia.status === 'downloading' ? 'downloading' : gatedMedia.status === 'ready' ? 'ready' : 'idle'}
          objectUrl={disabled ? null : gatedMedia.objectUrl}
          progress={gatedMedia.progress}
          posterUrl={thumbnail.objectUrl}
          disabled={disabled || playbackError}
          sizeLabel={meta || undefined}
          // Backend doesn't probe video duration yet (deferred, see PROGRESS.md) — VideoMessage
          // falls back to sizeLabel on its own whenever this is null.
          durationLabel={null}
          onStartDownload={gatedMedia.start}
          onCancelDownload={gatedMedia.cancel}
          onPlaybackError={() => setPlaybackError(true)}
        />
        <MediaStatus
          message={message}
          status={playbackError ? 'error' : gatedMedia.status}
          progressLabel={null}
          onRetry={() => {
            setPlaybackError(false);
            gatedMedia.retry();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-current/10 p-2">
      <FileText className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        {meta && !gatedProgressLabel && <p className="text-2xs opacity-70">{meta}</p>}
        <MediaStatus
          message={message}
          status={gatedMedia.status}
          progressLabel={gatedProgressLabel}
          onRetry={gatedMedia.retry}
        />
      </div>
      <Button
        type="button"
        variant={isOutbound ? 'secondary' : 'outline'}
        size="icon-sm"
        disabled={!message.mediaUrl || !!message.mediaDeletedAt || !!message.mediaDownloadError}
        aria-label={gatedMedia.status === 'downloading' ? t('cancelDownload') : t('download')}
        onClick={gatedMedia.status === 'downloading' ? gatedMedia.cancel : startFileDownload}>
        {gatedMedia.status === 'downloading' ? (
          <DownloadProgressRing progress={gatedMedia.progress?.total ? gatedMedia.progress.loaded / gatedMedia.progress.total : null} size={16} strokeWidth={2} />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
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
