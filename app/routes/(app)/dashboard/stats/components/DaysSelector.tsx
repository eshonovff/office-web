import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { STATS_DAYS_OPTIONS, type StatsDays } from '~/types/dashboardStats';

interface DaysSelectorProps {
  value: StatsDays;
  onChange: (days: StatsDays) => void;
}

export function DaysSelector({ value, onChange }: DaysSelectorProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      <span className="text-muted-foreground text-2xs">{t('stats.days.label')}</span>
      <div className="flex gap-1 rounded-md border p-0.5">
        {STATS_DAYS_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            aria-pressed={days === value}
            onClick={() => onChange(days)}
            className={cn(
              'rounded px-2 py-1 text-2xs font-medium transition-colors',
              days === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
            {t(`stats.days.${days}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
