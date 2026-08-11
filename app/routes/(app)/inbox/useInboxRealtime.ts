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

/** Joins the /hubs/inbox channel groups for `channelIds` and keeps the inbox's queries live. */
export function useInboxRealtime(channelIds: string[], openConversationId?: string | null) {
  const queryClient = useQueryClient();
  const { connection, status, reconnectCount, start, stop } = useInboxHub();
  const setHubError = useInboxHub((s) => s.setError);

  useEffect(() => {
    // React StrictMode mounts, cleans up, and mounts effects again in development.
    // Deferring one tick lets that synthetic cleanup cancel the first start before
    // SignalR begins negotiation and logs a misleading connection failure.
    const startTimer = window.setTimeout(() => void start(), 0);
    return () => {
      window.clearTimeout(startTimer);
      void stop();
    };
    // Mount/unmount only — start/stop are idempotent, and re-running this on
    // every render (start/stop are stable store actions but re-created per
    // createHubStore call) would just churn the same connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
