import { Check, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Label } from '~/components/ui/label';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { formatDate, formatPhoneNumber } from '~/lib/format';
import type { ConversationDetail, ConversationStatus } from '~/types/conversation';
import { AssignmentHistory } from './AssignmentHistory';

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
  const [handleCopied, setHandleCopied] = useState(false);

  const displayName = conversation.contactName || conversation.externalId;
  const initials = displayName.slice(0, 2).toUpperCase();

  // Only WhatsApp's externalId is a phone number — Instagram/Facebook use a
  // platform-scoped user id there (IGSID/PSID), meaningless to a human. This
  // copies whichever value is actually the displayed identity: the phone
  // for WhatsApp, the resolved name/username otherwise.
  const isWhatsApp = conversation.channelType === 'WhatsApp';
  const phoneNumber = isWhatsApp ? formatPhoneNumber(conversation.externalId) : null;
  const copyValue = phoneNumber ?? displayName;

  // Instagram only — GetContactProfileAsync fetches @handle separately from
  // display name (Facebook's Profile API has no equivalent, contactUsername
  // stays null there) — a direct link to the customer's real profile.
  const instagramProfileUrl =
    conversation.channelType === 'Instagram' && conversation.contactUsername
      ? `https://www.instagram.com/${conversation.contactUsername}/`
      : null;

  async function copyContactHandle() {
    await navigator.clipboard.writeText(copyValue);
    setHandleCopied(true);
    setTimeout(() => setHandleCopied(false), 1500);
  }

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
        <div className="flex items-center gap-1">
          <span className="font-semibold">{displayName}</span>
          {!phoneNumber && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => void copyContactHandle()}
              title={t('copy')}
              aria-label={t('copy')}>
              {handleCopied ? <Check className="text-success h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          )}
        </div>
        {phoneNumber && (
          <div className="text-muted-foreground flex items-center gap-1 text-2xs">
            <span>{t('contactHandleLabel.WhatsApp')}:</span>
            <span className="font-mono">{phoneNumber}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => void copyContactHandle()}
              title={t('copy')}
              aria-label={t('copy')}>
              {handleCopied ? <Check className="text-success h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        )}
        {instagramProfileUrl && (
          <a
            href={instagramProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground inline-flex items-center gap-1 text-2xs underline underline-offset-2 hover:opacity-80">
            <ExternalLink className="h-3 w-3" />@{conversation.contactUsername}
          </a>
        )}
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

      <AssignmentHistory conversationId={conversation.id} />
    </div>
  );
}
