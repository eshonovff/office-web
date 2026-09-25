import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Eye, EyeOff, MessageSquareReply, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerCommentKeys, customerCommentsApi } from '~/api/customerComments';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { formatRelativeTime } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { CustomerComment } from '~/types/customerComments';
import { DirectDialog } from './DirectDialog';

// Instagram's limit for a Direct message; a public reply is kept to the same (CommentTextRequestValidator).
const MAX_TEXT = 1000;

interface CommentItemProps {
  comment: CustomerComment;
  /** False once the plan has run out, or the account must be reconnected: reading only. */
  canAct: boolean;
  isReply?: boolean;
}

export function CommentItem({ comment, canAct, isReply = false }: CommentItemProps) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [directOpen, setDirectOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: customerCommentKeys.all });

  const reply = useMutation({
    mutationFn: (text: string) => customerCommentsApi.reply(comment.id, text),
    onSuccess: () => {
      setReplyText('');
      setReplying(false);
      toast.success(t('comments.replied'));
    },
    onSettled: refresh,
  });
  const hide = useMutation({
    mutationFn: () => customerCommentsApi.setHidden(comment.id, !comment.isHidden),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: () => customerCommentsApi.remove(comment.id),
    onSuccess: () => {
      setDeleting(false);
      toast.success(t('comments.deleted'));
    },
    onSettled: refresh,
  });

  const author = comment.isOwn
    ? t('comments.you')
    : comment.authorUsername
      ? `@${comment.authorUsername}`
      : t('comments.fan');
  const submitReply = () => {
    const text = replyText.trim();
    if (text && !reply.isPending) reply.mutate(text);
  };

  return (
    <div className={cn('space-y-1.5', isReply && 'border-l-2 pl-3')}>
      <div
        className={cn(
          'rounded-lg px-3 py-2',
          comment.isOwn ? 'bg-primary/10' : 'bg-muted/60',
          comment.isHidden && 'opacity-60'
        )}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {!comment.isOwn && comment.authorUsername ? (
            <a
              href={`https://instagram.com/${encodeURIComponent(comment.authorUsername)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold hover:underline">
              {author}
            </a>
          ) : (
            <span className="text-sm font-semibold">{author}</span>
          )}
          {comment.postedByAutomation && (
            <span className="text-muted-foreground inline-flex items-center gap-0.5 text-[11px]">
              <Bot className="size-3" />
              {t('comments.automated')}
            </span>
          )}
          <span className="text-muted-foreground text-[11px]">{formatRelativeTime(comment.commentedAt)}</span>
          {!comment.isOwn && !comment.isRead && <Badge className="h-4 px-1.5 text-[10px]">{t('comments.new')}</Badge>}
          {comment.isHidden && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              {t('comments.hidden')}
            </Badge>
          )}
          {comment.directSent && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {t('comments.directSent')}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{comment.text}</p>
        {comment.autoReplyError && (
          <p className="text-destructive mt-1 text-xs">
            {t('comments.autoReplyFailed', { reason: comment.autoReplyError })}
          </p>
        )}
      </div>

      {canAct && (
        <div className="flex flex-wrap gap-1">
          {!comment.isOwn && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setReplying((r) => !r)}>
              <MessageSquareReply className="size-3.5" />
              {t('comments.reply')}
            </Button>
          )}
          {comment.canSendDirect && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setDirectOpen(true)}>
              <Send className="size-3.5" />
              {t('comments.direct')}
            </Button>
          )}
          {!comment.isOwn && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={hide.isPending}
              onClick={() => hide.mutate()}>
              {comment.isHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              {comment.isHidden ? t('comments.unhide') : t('comments.hide')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-7 gap-1 text-xs"
            onClick={() => setDeleting(true)}>
            <Trash2 className="size-3.5" />
            {t('comments.delete')}
          </Button>
        </div>
      )}

      {replying && (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitReply();
          }}>
          <Textarea
            autoFocus
            rows={1}
            maxLength={MAX_TEXT}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submitReply();
              }
            }}
            placeholder={t('comments.replyPlaceholder')}
            aria-label={t('comments.replyPlaceholder')}
            className="min-h-9 resize-none text-sm"
          />
          <Button type="submit" size="sm" disabled={!replyText.trim() || reply.isPending}>
            {t('comments.send')}
          </Button>
        </form>
      )}

      <DirectDialog comment={comment} open={directOpen} onClose={() => setDirectOpen(false)} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        type="danger"
        title={t('comments.deleteTitle')}
        description={t('comments.deleteDescription')}
        confirmText={t('comments.delete')}
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
