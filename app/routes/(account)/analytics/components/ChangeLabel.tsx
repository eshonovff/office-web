import { cn } from '~/lib/utils';
import type { AnalyticsCount } from '~/types/customerAnalytics';
import { change } from '../analytics';

/** "↑ +12%" in green, "↓ −5%" in red — the change against the period before; nothing when both are zero. */
export function ChangeLabel({ count, className }: { count: AnalyticsCount; className?: string }) {
  const { trend, label } = change(count);
  if (!label) return null;
  return (
    <span
      data-trend={trend}
      className={cn(
        'text-xs font-medium whitespace-nowrap tabular-nums',
        trend === 'up' && 'text-success',
        trend === 'down' && 'text-destructive',
        trend === 'same' && 'text-muted-foreground',
        className
      )}>
      {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}
      {label}
    </span>
  );
}
