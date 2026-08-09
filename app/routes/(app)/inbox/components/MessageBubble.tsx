import { AlertCircle, Check, CheckCheck, Clock, Contact, FileText, Image, MapPin, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { Message, MessageType } from '~/types/message';

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

        {MediaIcon && (
          <a
            href={message.mediaUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className={cn('flex items-center gap-1.5 text-2xs underline', !message.mediaUrl && 'pointer-events-none')}>
            <MediaIcon className="h-3.5 w-3.5" />
            {t(`messageType.${message.type}`)}
          </a>
        )}

        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}

        <div className={cn('flex items-center gap-1 text-2xs', isOutbound ? 'justify-end opacity-70' : 'text-muted-foreground')}>
          <span>{formatDate(message.createdAt, true)}</span>
          {isOutbound && <DeliveryStatusIcon status={message.deliveryStatus} />}
        </div>
      </div>
    </div>
  );
}
