import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { customerChatKeys, customerChatsApi } from '~/api/customerChats';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import type { CustomerChatDetail } from '~/types/customerChats';
import { composerBlock, MAX_MESSAGE_LENGTH } from '../composerBlock';

export function ChatComposer({ chat }: { chat: CustomerChatDetail }) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { mutate: send, isPending } = useMutation({
    mutationFn: (body: string) => customerChatsApi.send(chat.id, body),
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: customerChatKeys.all });
    },
    // The server's reason is already shown by customerApiClient; the chat itself may have
    // changed under us (plan ended, window closed) — re-read it so the composer says why.
    onError: () => void queryClient.invalidateQueries({ queryKey: customerChatKeys.detail(chat.id) }),
  });

  const block = composerBlock(chat);
  if (block) {
    return (
      <div className="bg-muted/40 border-t px-4 py-3 text-sm" role="note">
        <p className="text-muted-foreground">{t(`chats.blocked.${block}`)}</p>
        {block === 'plan' && (
          <Link to="/account/billing" className="text-primary hover:underline">
            {t('chats.blocked.planAction')}
          </Link>
        )}
        {block === 'reconnect' && (
          <Link to="/account/automations" className="text-primary hover:underline">
            {t('chats.blocked.reconnectAction')}
          </Link>
        )}
      </div>
    );
  }

  const trimmed = text.trim();
  const submit = () => {
    if (trimmed && !isPending) send(trimmed);
  };

  return (
    <form
      className="flex items-end gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}>
      <div className="min-w-0 flex-1">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter is a new line — the chat-app habit.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={t('chats.placeholder')}
          aria-label={t('chats.placeholder')}
          className="max-h-40 min-h-10 resize-none"
        />
        {text.length > MAX_MESSAGE_LENGTH - 100 && (
          <p className="text-muted-foreground mt-1 text-right text-[11px] tabular-nums">
            {text.length}/{MAX_MESSAGE_LENGTH}
          </p>
        )}
      </div>
      <Button type="submit" size="icon" disabled={!trimmed || isPending} aria-label={t('chats.send')}>
        <SendHorizontal className="size-4" />
      </Button>
    </form>
  );
}
