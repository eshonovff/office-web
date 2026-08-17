import { HubConnectionState } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSignalR } from '~/hooks/useSignalR';
import { useInboxHub } from '~/store/useInboxHub';
import type { ConversationDetail } from '~/types/conversation';
import type { Message } from '~/types/message';

interface MessagesPage {
  items: Message[];
  totalCount: number;
  page: number;
  pageSize: number;
}
interface MessagesCache {
  pages: MessagesPage[];
  pageParams: unknown[];
}

/**
 * Joins the /hubs/inbox channel groups for `channelIds` and keeps the inbox's
 * queries live. The connection itself is started/stopped once for the whole
 * shell by useRealtimeConnection (app layout) — this hook only subscribes.
 */
export function useInboxRealtime(channelIds: string[], openConversationId?: string | null) {
  const queryClient = useQueryClient();
  const { connection, status, reconnectCount } = useInboxHub();
  const setHubError = useInboxHub((s) => s.setError);

  useEffect(() => {
    if (!connection || connection.state !== HubConnectionState.Connected) return;
    for (const channelId of channelIds) {
      connection
        .invoke('JoinChannel', channelId)
        .then(() => setHubError(null))
        .catch(() => setHubError('joinChannelFailed'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, reconnectCount, setHubError, channelIds.join(',')]);

  useEffect(() => {
    if (reconnectCount === 0) return;
    void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
    if (openConversationId) {
      void queryClient.invalidateQueries({ queryKey: ['conversations', openConversationId, 'messages'] });
    }
  }, [openConversationId, queryClient, reconnectCount]);

  function appendMessage(message: Message) {
    queryClient.setQueryData<MessagesCache>(['conversations', message.conversationId, 'messages'], (old) => {
      if (!old) return old;
      const [first, ...rest] = old.pages;
      if (first.items.some((m) => m.id === message.id)) return old;
      return { ...old, pages: [{ ...first, items: [message, ...first.items], totalCount: first.totalCount + 1 }, ...rest] };
    });
    void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
  }

  function upsertConversation(conversation: ConversationDetail) {
    queryClient.setQueryData(['conversations', conversation.id], conversation);
    void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
  }

  useSignalR(connection, {
    MessageReceived: (message: unknown) => appendMessage(message as Message),
    MessageSent: (message: unknown) => appendMessage(message as Message),
    ConversationAssigned: (conversation: unknown) => upsertConversation(conversation as ConversationDetail),
    // Backend also reuses this event for read receipts (MarkAsReadAsync) —
    // the payload is always the full ConversationDetail either way, so the
    // same "upsert + broad list refetch" handles both without needing to
    // tell the two cases apart.
    ConversationStatusChanged: (conversation: unknown) => upsertConversation(conversation as ConversationDetail),
  });

  return status;
}
