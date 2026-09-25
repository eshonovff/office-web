import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerChatKeys } from '~/api/customerChats';
import { customerCommentKeys, customerCommentsApi } from '~/api/customerComments';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { formatDate } from '~/lib/format';
import type { CustomerComment } from '~/types/customerComments';

const MAX_TEXT = 1000;

interface DirectDialogProps {
  comment: CustomerComment;
  open: boolean;
  onClose: () => void;
}

// The one Direct message Instagram allows per comment (within 7 days) — the dialog says so
// before sending, since there is no second try. The server enforces the same rules.
export function DirectDialog({ comment, open, onClose }: DirectDialogProps) {
  const { t } = useTranslation(['customerAuth', 'common']);
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const send = useMutation({
    mutationFn: (body: string) => customerCommentsApi.sendDirect(comment.id, body),
    onSuccess: () => {
      toast.success(t('comments.directDone'));
      setText('');
      onClose();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: customerCommentKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerChatKeys.all });
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('comments.directTitle', {
        username: comment.authorUsername ? `@${comment.authorUsername}` : t('comments.fan'),
      })}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={send.isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" disabled={!text.trim() || send.isPending} onClick={() => send.mutate(text.trim())}>
            {t('comments.send')}
          </Button>
        </>
      }>
      <div className="space-y-3">
        <p className="bg-muted/60 rounded-lg px-3 py-2 text-sm break-words">{comment.text}</p>
        <p className="text-muted-foreground text-xs">
          {t('comments.directHint', { until: formatDate(comment.directAvailableUntil, true) })}
        </p>
        <Textarea
          rows={4}
          maxLength={MAX_TEXT}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('comments.directPlaceholder')}
          aria-label={t('comments.directPlaceholder')}
        />
      </div>
    </Modal>
  );
}
