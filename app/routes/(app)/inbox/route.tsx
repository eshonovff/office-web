import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { conversationsApi } from '~/api/conversations';
import { EmptyState } from '~/components/shared/EmptyState';
import { ConversationList } from './components/ConversationList';
import { ContextPanel } from './components/ContextPanel';
import { MessageThread } from './components/MessageThread';

export default function InboxPage() {
  const { t } = useTranslation('inbox');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('conversation');

  function selectConversation(id: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('conversation', id);
        return next;
      },
      { preventScrollReset: true }
    );
  }

  const { data: conversation } = useQuery({
    queryKey: ['conversations', selectedId],
    queryFn: () => conversationsApi.get(selectedId!),
    enabled: !!selectedId,
  });

  // Non-admin users can't call GET /channels (gated on channels.manage), so
  // the channel filter's options come from what's actually visible in the
  // conversation data itself, not a separate channels fetch.
  const { data: firstPage } = useQuery({
    queryKey: ['conversations', 'channel-options'],
    queryFn: () => conversationsApi.list({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const channelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of firstPage?.items ?? []) seen.set(item.channelId, item.channelName);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [firstPage]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[320px_1fr_300px] gap-3">
      <div className="bg-sidebar min-h-0 rounded-xl">
        <ConversationList channelOptions={channelOptions} selectedId={selectedId} onSelect={selectConversation} />
      </div>

      <div className="bg-sidebar min-h-0 rounded-xl">
        {selectedId ? (
          <MessageThread conversationId={selectedId} conversation={conversation ?? null} />
        ) : (
          <EmptyState message={t('selectConversation')} className="h-full" />
        )}
      </div>

      <div className="bg-sidebar min-h-0 rounded-xl">
        {selectedId && conversation && <ContextPanel conversation={conversation} />}
      </div>
    </div>
  );
}
