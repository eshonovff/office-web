import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import type { ModeratorSubscriptionRequest } from '~/types/subscriptionRequests';
import { useLastRequest } from './useLastRequest';

// Same limit as RejectSubscriptionRequestValidator on the backend.
const NOTE_MAX_LENGTH = 1000;
const PRESETS = ['notReceived', 'wrongAmount', 'unreadable'] as const;

interface RejectDialogProps {
  request: ModeratorSubscriptionRequest | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (id: string, note: string) => void;
}

// The reason is required: it is the only thing the мизоҷ learns about why (billing page + email).
export function RejectDialog({ request, isLoading, onClose, onConfirm }: RejectDialogProps) {
  const { t } = useTranslation(['subscriptions', 'common']);
  const shown = useLastRequest(request);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  // A new request opens with an empty reason, never the previous one's.
  const [noteFor, setNoteFor] = useState(request?.id);
  if (request && request.id !== noteFor) {
    setNoteFor(request.id);
    setNote('');
    setTouched(false);
  }

  const trimmed = note.trim();
  const showRequired = touched && trimmed.length === 0;

  function submit() {
    setTouched(true);
    if (!shown || trimmed.length === 0) return;
    onConfirm(shown.id, trimmed);
  }

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{t('reject.title')}</DialogTitle>
          <DialogDescription>{shown && t('reject.description', { name: shown.customerFullName })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reject-note">{t('reject.noteLabel')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setNote(t(`reject.presets.${preset}`));
                  setTouched(true);
                }}>
                {t(`reject.presets.${preset}`)}
              </Button>
            ))}
          </div>
          <Textarea
            id="reject-note"
            value={note}
            maxLength={NOTE_MAX_LENGTH}
            rows={3}
            placeholder={t('reject.notePlaceholder')}
            aria-invalid={showRequired}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {showRequired && <p className="text-destructive text-xs">{t('reject.noteRequired')}</p>}
        </div>

        <DialogFooter className="flex-row gap-3">
          <Button type="button" variant="ghost" className="flex-1" disabled={isLoading} onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" variant="destructive" className="flex-1" disabled={isLoading} onClick={submit}>
            {t('reject.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
