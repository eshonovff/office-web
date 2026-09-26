import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { fmtNumber } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { AnalyticsBroadcasts } from '~/types/customerAnalytics';

export function BroadcastsSection({ broadcasts }: { broadcasts: AnalyticsBroadcasts }) {
  const { t } = useTranslation('customerAuth');
  const numbers = [
    { key: 'count', value: broadcasts.broadcasts },
    { key: 'sent', value: broadcasts.sent, className: 'text-success' },
    { key: 'skipped', value: broadcasts.skipped },
    { key: 'failed', value: broadcasts.failed, className: broadcasts.failed > 0 ? 'text-destructive' : undefined },
  ];

  return (
    <section className="bg-card min-w-0 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('analytics.broadcasts.title')}</h2>
          <p className="text-muted-foreground text-xs">{t('analytics.broadcasts.subtitle')}</p>
        </div>
        <Link
          to="/account/broadcasts"
          className="text-primary inline-flex shrink-0 items-center gap-0.5 text-xs hover:underline">
          {t('analytics.broadcasts.all')}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {broadcasts.broadcasts === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">{t('analytics.broadcasts.empty')}</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {numbers.map(({ key, value, className }) => (
            <div key={key} className="rounded-lg border p-2.5">
              <dt className="text-muted-foreground text-2xs">{t(`analytics.broadcasts.${key}`)}</dt>
              <dd className={cn('text-lg font-semibold tabular-nums', className)}>{fmtNumber(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
