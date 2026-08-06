import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';

interface TemporaryPasswordModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  temporaryPassword: string;
  smsSent?: boolean;
}

export function TemporaryPasswordModal({
  open,
  onClose,
  username,
  temporaryPassword,
  smsSent,
}: TemporaryPasswordModalProps) {
  const { t } = useTranslation('users');
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open={open} onClose={onClose} title={t('temporaryPasswordTitle')}>
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">{t('temporaryPasswordDescription', { username })}</p>
        <div className="bg-muted flex items-center justify-between gap-2 rounded-lg border p-3">
          <code className="text-sm font-semibold">{temporaryPassword}</code>
          <Button variant="ghost" size="icon" onClick={copy} title={t('copy')}>
            {copied ? <Check className="text-success h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-muted-foreground text-2xs">{t('temporaryPasswordHint')}</p>
        {smsSent !== undefined && (
          <p className={smsSent ? 'text-success text-sm' : 'text-destructive text-sm'}>
            {smsSent ? t('smsSentNotice') : t('smsNotSentNotice')}
          </p>
        )}
      </div>
    </Modal>
  );
}
