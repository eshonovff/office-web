import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

interface ChipInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Free-text tag input (keywords, comment replies) — no fixed option list, so the existing
 * CustomSelect/Combobox (built for picking from known options) doesn't fit. Enter or comma adds
 * the current text as a chip; Backspace on an empty input removes the last chip.
 */
export function ChipInput({ value, onChange, placeholder, className, disabled }: ChipInputProps) {
  const [draft, setDraft] = useState('');

  function commitDraft() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div
      className={cn(
        'flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5',
        disabled && 'pointer-events-none opacity-50',
        className
      )}>
      {value.map((chip, index) => (
        <span key={`${chip}-${index}`} className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs">
          {chip}
          <button type="button" onClick={() => removeAt(index)} className="hover:text-foreground" aria-label={`Remove ${chip}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={value.length === 0 ? placeholder : undefined}
        disabled={disabled}
        className="h-6 min-w-24 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
      />
    </div>
  );
}
