import { CircleCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCardNumber } from '~/lib/customerSubscription';
import { cn } from '~/lib/utils';
import type { PaymentCard } from '~/types/customerSubscriptions';
import { CopyButton } from './CopyButton';

// Keyed by the backend's Subscriptions:PaymentCards[].BankCode; files live in public/banks/.
const BANK_LOGOS: Record<string, string> = {
  dc: '/banks/dc.svg',
  alif: '/banks/alif.svg',
};

interface BankOptionProps {
  card: PaymentCard;
  selected: boolean;
  onSelect: () => void;
}

// Step one of paying: only the bank, no number yet — the number appears once a bank is
// chosen (PaymentCardDetails), so the customer copies from the card they actually picked.
export function BankOption({ card, selected, onSelect }: BankOptionProps) {
  const logo = BANK_LOGOS[card.bankCode];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'focus-visible:ring-ring relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors outline-none focus-visible:ring-2',
        selected ? 'border-primary bg-primary/5 ring-primary ring-1' : 'hover:bg-muted/50'
      )}>
      {selected && <CircleCheck className="text-primary absolute top-2 right-2 size-4" />}
      {logo && (
        // Always on white: both official logos have dark-on-light wordmarks (Alif's is
        // #222) that vanish on the dark theme's background.
        <span className="flex h-10 w-20 items-center justify-center rounded-lg bg-white px-1.5">
          <img src={logo} alt="" className="max-h-7 w-full object-contain" />
        </span>
      )}
      <span className="text-sm font-medium">{card.bank}</span>
    </button>
  );
}

interface PaymentCardDetailsProps {
  card: PaymentCard;
}

export function PaymentCardDetails({ card }: PaymentCardDetailsProps) {
  const { t } = useTranslation('customerAuth');

  return (
    <div className="bg-muted/50 space-y-1 rounded-xl border p-4">
      <p className="text-muted-foreground text-xs">{t('billing.payment.transferTo', { bank: card.bank })}</p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-bold tabular-nums sm:text-xl">{formatCardNumber(card.cardNumber)}</span>
        <div className="ml-auto">
          <CopyButton value={card.cardNumber.replace(/\s+/g, '')} />
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{card.holderName}</p>
    </div>
  );
}
