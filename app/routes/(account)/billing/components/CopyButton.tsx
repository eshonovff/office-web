import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';

interface CopyButtonProps {
  value: string;
}

// The amount and the card number are typed into a banking app on the same phone — copying
// beats retyping 16 digits, and a typo in the dirams makes the payment unmatchable.
export function CopyButton({ value }: CopyButtonProps) {
  const { t } = useTranslation('customerAuth');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label={copied ? t('billing.payment.copied') : t('billing.payment.copy')}
      title={copied ? t('billing.payment.copied') : t('billing.payment.copy')}>
      {copied ? <Check className="text-primary" /> : <Copy />}
    </Button>
  );
}
