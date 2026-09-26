import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { fmtNumber } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { AnalyticsRuleRow } from '~/types/customerAnalytics';
import { percentOf } from '../analytics';

const COLUMNS = 'sm:grid-cols-[minmax(0,1fr)_repeat(4,5.5rem)_9rem]';

export function RulesSection({ rules }: { rules: AnalyticsRuleRow[] }) {
  const { t } = useTranslation('customerAuth');

  return (
    <section className="bg-card min-w-0 rounded-xl border">
      <header className="border-b p-4">
        <h2 className="text-sm font-semibold">{t('analytics.rules.title')}</h2>
        <p className="text-muted-foreground text-xs">{t('analytics.rules.subtitle')}</p>
      </header>

      {rules.length === 0 ? (
        <p className="text-muted-foreground p-6 text-center text-sm">{t('analytics.rules.empty')}</p>
      ) : (
        <>
          <div
            className={`text-muted-foreground text-2xs hidden gap-3 border-b px-4 py-2 font-medium sm:grid ${COLUMNS}`}>
            <span />
            <span className="text-right">{t('analytics.rules.comments')}</span>
            <span className="text-right">{t('analytics.rules.publicReplies')}</span>
            <span className="text-right">{t('analytics.rules.directMessages')}</span>
            <span className="text-right">{t('analytics.rules.errors')}</span>
            <span className="text-right" title={t('analytics.rules.followHint')}>
              {t('analytics.rules.follow')}
            </span>
          </div>
          <ul className="divide-y">
            {rules.map((rule) => (
              <li key={rule.ruleId}>
                <RuleRow rule={rule} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function RuleRow({ rule }: { rule: AnalyticsRuleRow }) {
  const { t } = useTranslation('customerAuth');
  const followRate = percentOf(rule.followedAfterAsking, rule.askedToFollow);

  return (
    <div aria-label={rule.name} className={`grid grid-cols-3 items-center gap-x-3 gap-y-1.5 px-4 py-3 ${COLUMNS}`}>
      <span className="col-span-3 flex min-w-0 items-center gap-2 sm:col-span-1">
        <span className="truncate text-sm font-medium">{rule.name}</span>
        {!rule.isActive && <Badge variant="secondary">{t('analytics.rules.inactive')}</Badge>}
      </span>
      <Cell label={t('analytics.rules.comments')} value={fmtNumber(rule.comments)} />
      <Cell label={t('analytics.rules.publicReplies')} value={fmtNumber(rule.publicReplies)} />
      <Cell label={t('analytics.rules.directMessages')} value={fmtNumber(rule.directMessages)} />
      <Cell
        label={t('analytics.rules.errors')}
        value={fmtNumber(rule.errors)}
        className={rule.errors > 0 ? 'text-destructive' : undefined}
      />
      <Cell
        label={t('analytics.rules.follow')}
        value={
          rule.askedToFollow === 0
            ? '—'
            : `${fmtNumber(rule.askedToFollow)} → ${fmtNumber(rule.followedAfterAsking)} · ${followRate}%`
        }
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}

function Cell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className={cn('min-w-0 text-sm tabular-nums sm:text-right', className)}>
      <span className="text-muted-foreground text-2xs block sm:hidden">{label}</span>
      {value}
    </span>
  );
}
