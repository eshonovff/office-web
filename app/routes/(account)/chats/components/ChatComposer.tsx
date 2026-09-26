import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Paperclip, SendHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { customerChatKeys, customerChatsApi } from '~/api/customerChats';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import type { CustomerChatDetail } from '~/types/customerChats';
import { composerBlock, MAX_MESSAGE_LENGTH } from '../composerBlock';
import { SENDABLE_MEDIA_TYPES, sendableProblem } from '../sendableMedia';

export function ChatComposer({ chat }: { chat: CustomerChatDetail }) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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

  // A photo, video, audio or PDF — sent at once (no "undo" delay: it is chosen on purpose).
  const { mutate: sendFile, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => customerChatsApi.sendMedia(chat.id, file),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerChatKeys.all }),
    onError: () => void queryClient.invalidateQueries({ queryKey: customerChatKeys.detail(chat.id) }),
  });

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const problem = sendableProblem(file);
    if (problem) {
      toast.error(problem.key === 'fileTooBig' ? t('chats.fileTooBig', { mb: problem.mb }) : t('chats.fileNotAllowed'));
      return;
    }
    sendFile(file);
  };

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
      <input
        ref={fileRef}
        type="file"
        accept={SENDABLE_MEDIA_TYPES.join(',')}
        aria-label={t('chats.attach')}
        className="hidden"
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isUploading}
        aria-label={t('chats.attach')}
        title={t('chats.attach')}
        onClick={() => fileRef.current?.click()}>
        {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
      </Button>
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
