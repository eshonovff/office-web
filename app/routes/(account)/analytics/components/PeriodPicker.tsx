import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateInputField } from '~/components/shared/DateInputField';
import { toDate } from '~/lib/date';
import { cn } from '~/lib/utils';
import type { AnalyticsRange } from '~/types/customerAnalytics';
import { EARLIEST_DATE, PERIOD_PRESETS, type Period, type PeriodPreset, rangeError } from '../analytics';

interface PeriodPickerProps {
  period: Period;
  today: string;
  onPreset: (preset: PeriodPreset) => void;
  onRange: (range: AnalyticsRange) => void;
}

// 7 / 30 / 90 days, or two dates. Picked dates reach the page only once they make a period the
// server accepts — until then the page keeps showing the last good one, with the reason here.
export function PeriodPicker({ period, today, onPreset, onRange }: PeriodPickerProps) {
  const { t } = useTranslation('customerAuth');
  const [custom, setCustom] = useState(period.preset === null);
  const [draft, setDraft] = useState<{ from: string | null; to: string | null }>({ from: period.from, to: period.to });
  const error = custom ? rangeError(draft.from, draft.to, today) : null;
  // The limits go to flatpickr as Dates: a string would be read in its display format (d.m.Y),
  // 'YYYY-MM-DD' is misread, and then no date fits — the fields stay empty.
  const earliest = useMemo(() => toDate(EARLIEST_DATE)!, []);
  const latest = useMemo(() => toDate(today)!, [today]);
  const fromMax = useMemo(() => toDate(draft.to) ?? latest, [draft.to, latest]);
  const toMin = useMemo(() => toDate(draft.from) ?? earliest, [draft.from, earliest]);

  const change = (next: { from: string | null; to: string | null }) => {
    setDraft(next);
    if (rangeError(next.from, next.to, today) === null) onRange({ from: next.from!, to: next.to! });
  };

  return (
    <div className="space-y-2">
      <div role="group" aria-label={t('analytics.period.label')} className="flex w-fit gap-1 rounded-md border p-0.5">
        {PERIOD_PRESETS.map((preset) => (
          <PresetButton
            key={preset}
            pressed={!custom && period.preset === preset}
            onClick={() => {
              setCustom(false);
              onPreset(preset);
            }}>
            {t('analytics.period.days', { count: preset })}
          </PresetButton>
        ))}
        <PresetButton
          pressed={custom}
          onClick={() => {
            setCustom(true);
            setDraft({ from: period.from, to: period.to });
          }}>
          {t('analytics.period.custom')}
        </PresetButton>
      </div>

      {custom && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <DateInputField
              label={t('analytics.period.from')}
              value={draft.from}
              minDate={earliest}
              maxDate={fromMax}
              onChange={(from) => change({ ...draft, from })}
              className="w-40"
            />
            <DateInputField
              label={t('analytics.period.to')}
              value={draft.to}
              minDate={toMin}
              maxDate={latest}
              onChange={(to) => change({ ...draft, to })}
              className="w-40"
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-xs">
              {t(`analytics.period.errors.${error}`)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PresetButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
        pressed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      )}>
      {children}
    </button>
  );
}
