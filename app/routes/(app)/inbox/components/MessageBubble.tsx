import { AlertCircle, Check, CheckCheck, Clock, Contact, Download, FileText, Image, MapPin, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { Message, MessageType } from '~/types/message';
import { getMessageObjectUrl, useMessageBlobUrl } from '../useMessageBlobUrl';
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
  }
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

function MediaStatus({ message, status }: { message: Message; status: ReturnType<typeof useMessageBlobUrl>['status'] }) {
  const { t } = useTranslation('inbox');
  const errorKey = message.mediaDownloadError ? 'mediaDownloadFailed' : mediaErrorKey(status);
  if (message.mediaDeletedAt) return <p className="text-2xs opacity-75">{t('mediaGone')}</p>;
  if (errorKey) return <p className="text-2xs opacity-75">{t(errorKey)}</p>;
  if (status === 'loading') return <p className="text-2xs opacity-75">{t('mediaLoading')}</p>;
  return null;
}

function MessageMedia({ message, isOutbound }: { message: Message; isOutbound: boolean }) {
  const { t } = useTranslation('inbox');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const mediaUnavailable = !!message.mediaDeletedAt || !!message.mediaDownloadError;
  const media = useMessageBlobUrl('media', message.id, mediaUnavailable ? null : message.mediaUrl);
  const thumbnail = useMessageBlobUrl('thumbnail', message.id, message.mediaDownloadError ? null : message.thumbnailUrl);
  const MediaIcon = MEDIA_ICON[message.type] ?? Paperclip;
  const fileName = message.originalFileName || t(`messageType.${message.type}`);
  const meta = formatBytes(message.sizeBytes);

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

  if (message.type === 'Image' || message.type === 'StoryReply') {
    const previewUrl = thumbnail.objectUrl ?? media.objectUrl;
    return (
      <div className="space-y-1.5">
        {previewUrl ? (
          <button type="button" className="block overflow-hidden rounded-md" onClick={() => media.objectUrl && setLightboxOpen(true)}>
            <img src={previewUrl} alt={fileName} className="max-h-56 max-w-full object-cover" />
          </button>
        ) : (
          <div className="bg-muted flex min-h-24 min-w-48 items-center justify-center rounded-md">
            <Image className="text-muted-foreground h-5 w-5" />
          </div>
        )}
        <MediaStatus message={message} status={media.status === 'idle' ? thumbnail.status : media.status} />
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl p-2" showCloseButton>
            <DialogTitle className="sr-only">{fileName}</DialogTitle>
            {media.objectUrl && <img src={media.objectUrl} alt={fileName} className="max-h-[80vh] w-full rounded-md object-contain" />}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (message.type === 'Audio') {
    const showWaveform = !!message.voiceDurationSeconds && !!message.waveformPeaks?.length;
    return (
      <div className="space-y-1.5">
        {showWaveform ? (
          <VoiceNotePlayer
            src={message.mediaDeletedAt ? null : media.objectUrl}
            durationSeconds={message.voiceDurationSeconds}
            peaks={message.waveformPeaks!}
            disabled={!!message.mediaDeletedAt || !!message.mediaDownloadError}
          />
        ) : media.objectUrl ? (
          <audio src={media.objectUrl} controls preload="metadata" className="w-64 max-w-full" />
        ) : (
          <div className="flex items-center gap-1.5 text-2xs">
            <MediaIcon className="h-3.5 w-3.5" />
            {t('messageType.Audio')}
          </div>
        )}
        <MediaStatus message={message} status={media.status} />
      </div>
    );
  }

  if (message.type === 'Video') {
    return (
      <div className="space-y-1.5">
        {media.objectUrl ? (
          <video src={media.objectUrl} controls preload="metadata" className="max-h-64 max-w-full rounded-md" />
        ) : (
          <div className="flex items-center gap-1.5 text-2xs">
            <MediaIcon className="h-3.5 w-3.5" />
            {t('messageType.Video')}
          </div>
        )}
        <MediaStatus message={message} status={media.status} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-current/10 p-2">
      <FileText className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        {meta && <p className="text-2xs opacity-70">{meta}</p>}
        {(message.mediaDeletedAt || message.mediaDownloadError || downloadStatus === 'error') && (
          <p className="text-2xs opacity-75">
            {message.mediaDeletedAt ? t('mediaGone') : message.mediaDownloadError ? t('mediaDownloadFailed') : t('mediaLoadFailed')}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant={isOutbound ? 'secondary' : 'outline'}
        size="icon-sm"
        disabled={!message.mediaUrl || !!message.mediaDeletedAt || !!message.mediaDownloadError || downloadStatus === 'loading'}
        onClick={downloadFile}>
        <Download className="h-3.5 w-3.5" />
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

        {message.type === 'Text' && message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}

        <div className={cn('flex items-center gap-1 text-2xs', isOutbound ? 'justify-end opacity-70' : 'text-muted-foreground')}>
          <span>{formatDate(message.createdAt, true)}</span>
          {isOutbound && <DeliveryStatusIcon status={message.deliveryStatus} />}
        </div>
      </div>
    </div>
  );
}
