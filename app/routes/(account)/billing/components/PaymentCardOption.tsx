import { CircleCheck } from 'lucide-react';
import { formatCardNumber } from '~/lib/customerSubscription';
import { cn } from '~/lib/utils';
import type { PaymentCard } from '~/types/customerSubscriptions';
import { CopyButton } from './CopyButton';

// Keyed by the backend's Subscriptions:PaymentCards[].BankCode; files live in public/banks/.
const BANK_LOGOS: Record<string, string> = {
  dc: '/banks/dc.svg',
  alif: '/banks/alif.svg',
};

interface PaymentCardOptionProps {
  card: PaymentCard;
  selected: boolean;
  onSelect: () => void;
}

// A radio option, not a <button>: it contains the copy button, and buttons can't nest.
// Copying also selects (the click bubbles up) — copying a card's number is choosing it.
export function PaymentCardOption({ card, selected, onSelect }: PaymentCardOptionProps) {
  const logo = BANK_LOGOS[card.bankCode];

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'focus-visible:ring-ring flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors outline-none focus-visible:ring-2',
        selected ? 'border-primary bg-primary/5 ring-primary ring-1' : 'hover:bg-muted/50'
      )}>
      {logo && (
        // Always on white: both official logos have dark-on-light wordmarks (Alif's is
        // #222) that vanish on the dark theme's background.
        <span className="relative flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white px-1.5 sm:w-20">
          <img src={logo} alt={card.bank} className="max-h-7 w-full object-contain" />
          {selected && (
            <CircleCheck className="text-primary bg-background absolute -top-1.5 -right-1.5 size-4 rounded-full" />
          )}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{card.bank}</p>
        <p className="font-mono text-sm font-semibold tabular-nums sm:text-base">{formatCardNumber(card.cardNumber)}</p>
        <p className="text-muted-foreground truncate text-xs">{card.holderName}</p>
      </div>
      <div className="ml-auto">
        <CopyButton value={card.cardNumber.replace(/\s+/g, '')} />
      </div>
    </div>
  );
}
