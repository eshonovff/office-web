import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { formatRelativeTime } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { ConversationListItem as ConversationListItemType, ConversationStatus } from '~/types/conversation';

const STATUS_CLASS: Record<ConversationStatus, string> = {
  New: 'text-primary border-primary/30',
  InProgress: 'text-foreground border-border',
  Waiting: 'text-warning border-warning/30',
  Closed: 'text-muted-foreground border-border',
};

interface ConversationListItemProps {
  conversation: ConversationListItemType;
  active: boolean;
  onClick: () => void;
}

export function ConversationListItem({ conversation, active, onClick }: ConversationListItemProps) {
  const { t } = useTranslation('inbox');

  const displayName = conversation.contactName || conversation.externalId;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
        active ? 'bg-accent border-border' : 'hover:bg-accent/50 border-transparent'
      )}>
      <Avatar>
        {conversation.contactAvatarUrl && <AvatarImage src={conversation.contactAvatarUrl} />}
        <AvatarFallback className="text-2xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{displayName}</span>
          {conversation.lastMessageAt && (
            <span className="text-muted-foreground shrink-0 text-2xs">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <MessageCircle className="text-muted-foreground h-3 w-3 shrink-0" />
          <span className="text-muted-foreground truncate text-2xs">{t(`channelType.${conversation.channelType}`)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn('text-2xs', STATUS_CLASS[conversation.status])}>
            {t(`status.${conversation.status}`)}
          </Badge>
          {conversation.unreadCount > 0 && (
            <Badge variant="default" className="text-2xs">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
