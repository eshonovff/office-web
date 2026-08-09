import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Label } from '~/components/ui/label';
import { formatDate } from '~/lib/format';
import type { ConversationDetail } from '~/types/conversation';

interface ContextPanelProps {
  conversation: ConversationDetail;
}

export function ContextPanel({ conversation }: ContextPanelProps) {
  const { t } = useTranslation('inbox');

  const displayName = conversation.contactName || conversation.externalId;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4 p-3">
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Avatar size="lg">
          {conversation.contactAvatarUrl && <AvatarImage src={conversation.contactAvatarUrl} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="font-semibold">{displayName}</span>
        <Badge variant="outline" className="text-2xs">
          {t(`channelType.${conversation.channelType}`)}
        </Badge>
      </div>

      <div className="space-y-1">
        <Label className="text-muted-foreground text-2xs">{t('channel')}</Label>
        <p className="text-sm">{conversation.channelName}</p>
      </div>

      <div className="space-y-1">
        <Label className="text-muted-foreground text-2xs">{t('assignee')}</Label>
        <p className="text-sm">{conversation.assignedToName || t('unassigned')}</p>
      </div>

      <div className="space-y-1">
        <Label className="text-muted-foreground text-2xs">{t('createdAt')}</Label>
        <p className="text-sm">{formatDate(conversation.createdAt, true)}</p>
      </div>
    </div>
  );
}
