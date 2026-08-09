import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import type { ConversationDetail } from '~/types/conversation';

interface MessageThreadProps {
  conversationId: string;
  conversation: ConversationDetail | null;
}

// Message list + composer land in the next two commits — this wires the
// header (contact/channel/status, so the pane isn't blank while picked)
// and reserves the body/footer layout they'll fill in.
export function MessageThread({ conversation }: MessageThreadProps) {
  const { t } = useTranslation('inbox');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        {conversation ? (
          <>
            <span className="text-sm font-semibold">{conversation.contactName || conversation.externalId}</span>
            <Badge variant="outline" className="text-2xs">
              {t(`status.${conversation.status}`)}
            </Badge>
          </>
        ) : (
          <Skeleton className="h-5 w-40" />
        )}
      </div>

      <div className="flex flex-1 items-center justify-center">
        <Skeleton className="h-4 w-32" />
        <span className="sr-only">{t('loadingMessages')}</span>
      </div>
    </div>
  );
}
