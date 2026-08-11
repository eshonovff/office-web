import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Label } from '~/components/ui/label';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { formatDate } from '~/lib/format';
import type { ConversationDetail, ConversationStatus } from '~/types/conversation';

const ALL_STATUSES: ConversationStatus[] = ['New', 'InProgress', 'Waiting', 'Closed'];

interface ContextPanelProps {
  conversation: ConversationDetail;
  onStatusChange: (status: ConversationStatus) => void;
  isChangingStatus: boolean;
}

export function ContextPanel({ conversation, onStatusChange, isChangingStatus }: ContextPanelProps) {
  const { t } = useTranslation('inbox');
  const { can } = useCan();
  const canAssign = can(Permissions.Inbox.Assign);
  const canClose = can(Permissions.Inbox.Close);

  const displayName = conversation.contactName || conversation.externalId;
  const initials = displayName.slice(0, 2).toUpperCase();

  // PATCH requires inbox.assign as a base, and an additional inbox.close
  // check specifically when the new status is Closed — so a user with
  // inbox.assign but not inbox.close can move a chat between every other
  // status, just not close it.
  const statusOptions = ALL_STATUSES.filter((s) => s !== 'Closed' || canClose).map((s) => ({
    value: s,
    label: t(`status.${s}`),
  }));

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
        <Label className="text-muted-foreground text-2xs">{t('statusLabel')}</Label>
        {canAssign ? (
          <CustomSelect
            options={statusOptions}
            value={conversation.status}
            onChange={(value) => value && onStatusChange(value as ConversationStatus)}
            disabled={isChangingStatus}
          />
        ) : (
          <Badge variant="outline" className="text-2xs">
            {t(`status.${conversation.status}`)}
          </Badge>
        )}
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
