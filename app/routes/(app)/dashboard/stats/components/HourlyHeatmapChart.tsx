import { useTranslation } from 'react-i18next';
import type { ChartResult, HeatmapPoint } from '~/types/dashboardStats';
import { ChartCard } from './ChartCard';

const REQUIRED_SAMPLE_SIZE = 100;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
// Backend's dayOfWeek is .NET's DayOfWeek encoding (0=Sunday..6=Saturday), not ISO — dayLabels
// must stay in that exact order to line up with the data.
const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];

interface HourlyHeatmapChartProps {
  result: ChartResult<HeatmapPoint>;
}

export function HourlyHeatmapChart({ result }: HourlyHeatmapChartProps) {
  const { t } = useTranslation('dashboard');
  const dayLabels = t('stats.hourlyHeatmap.dayLabels', { returnObjects: true }) as string[];

  // Sparse from the backend (zero cells omitted) — a lookup keyed "day-hour" is simpler and
  // cheaper than a nested array for a 7x24 grid this size.
  const cellByKey = new Map(result.data.map((point) => [`${point.dayOfWeek}-${point.hour}`, point.count]));
  const maxCount = Math.max(1, ...result.data.map((point) => point.count));

  return (
    <ChartCard
      title={t('stats.hourlyHeatmap.title')}
      description={t('stats.hourlyHeatmap.description')}
      sampleSize={result.sampleSize}
      sufficient={result.sufficient}
      requiredSampleSize={REQUIRED_SAMPLE_SIZE}
      unit={t('stats.units.messages')}>
      {/* Overflow safety (block, item "ҳатмӣ"): a 7x24 grid never fits a phone screen at a
          legible cell size — this scrolls horizontally INSIDE the card instead of ever pushing
          the page itself wider. min-w-max on the grid, not the card, is what makes that scroll
          local to this one component. */}
      <div className="scrollbar-thin min-w-0 overflow-x-auto">
        <div className="grid w-max grid-cols-[2rem_repeat(24,1.5rem)] gap-0.5">
          <div />
          {HOURS.map((hour) => (
            <div key={hour} className="text-muted-foreground text-center text-[10px] leading-4">
              {hour % 3 === 0 ? hour : ''}
            </div>
          ))}
          {DAYS_OF_WEEK.map((dayOfWeek) => (
            <div key={dayOfWeek} className="contents">
              <div className="text-muted-foreground flex items-center text-2xs">{dayLabels[dayOfWeek]}</div>
              {HOURS.map((hour) => {
                const count = cellByKey.get(`${dayOfWeek}-${hour}`) ?? 0;
                const intensity = count === 0 ? 0 : 0.15 + 0.85 * (count / maxCount);
                return (
                  <div
                    key={hour}
                    title={count > 0 ? t('stats.hourlyHeatmap.cellTooltip', { count }) : undefined}
                    className="aspect-square rounded-[3px]"
                    style={{ backgroundColor: count > 0 ? `color-mix(in oklch, var(--chart-1) ${intensity * 100}%, transparent)` : 'var(--muted)' }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
