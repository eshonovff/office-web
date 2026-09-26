import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mic, Paperclip, SendHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { customerChatKeys, customerChatsApi } from '~/api/customerChats';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { useVoiceRecorder } from '~/hooks/useVoiceRecorder';
import type { CustomerChatDetail } from '~/types/customerChats';
import { composerBlock, MAX_MESSAGE_LENGTH } from '../composerBlock';
import { maxBytesFor, SENDABLE_MEDIA_TYPES, sendableProblem } from '../sendableMedia';

const MB = 1024 * 1024;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

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

  // A voice note — like staff ones: recorded here, made AAC and sent by the server.
  const { mutate: sendVoice, isPending: isSendingVoice } = useMutation({
    mutationFn: (file: File) => customerChatsApi.sendVoiceNote(chat.id, file),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerChatKeys.all }),
    onError: () => void queryClient.invalidateQueries({ queryKey: customerChatKeys.detail(chat.id) }),
  });
  const voice = useVoiceRecorder((file) => {
    if (file.size > maxBytesFor(file.type)) {
      toast.error(t('chats.fileTooBig', { mb: maxBytesFor(file.type) / MB }));
      return;
    }
    sendVoice(file);
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
  // Replying stopped being possible mid-recording (the plan ran out, the window closed) —
  // the recording is thrown away and the microphone freed.
  const { recording, stop } = voice;
  useEffect(() => {
    if (block && recording) stop(false);
  }, [block, recording, stop]);

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
    <div className="border-t">
      {voice.error && (
        <p role="alert" className="text-destructive px-3 pt-2 text-xs">
          {t(`chats.voice.${voice.error}`)}
        </p>
      )}
      <form
        className="flex items-end gap-2 p-3"
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
        {voice.recording ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('chats.voice.cancel')}
              title={t('chats.voice.cancel')}
              onClick={() => voice.stop(false)}>
              <Trash2 className="size-4" />
            </Button>
            <div role="status" className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border px-3 text-sm">
              <span className="bg-destructive size-2.5 shrink-0 animate-pulse rounded-full" />
              <span className="truncate tabular-nums">
                {t('chats.voice.recording', { time: clock(voice.elapsed) })}
              </span>
            </div>
            <Button type="button" size="icon" aria-label={t('chats.voice.send')} onClick={() => voice.stop(true)}>
              <SendHorizontal className="size-4" />
            </Button>
          </>
        ) : (
          <>
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
            {/* The chat-app habit: with nothing typed the button records a voice note. */}
            {trimmed ? (
              <Button type="submit" size="icon" disabled={isPending} aria-label={t('chats.send')}>
                <SendHorizontal className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isSendingVoice}
                aria-label={t('chats.voice.record')}
                title={t('chats.voice.record')}
                onClick={() => void voice.start()}>
                {isSendingVoice ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
              </Button>
            )}
          </>
        )}
      </form>
    </div>
  );
}
