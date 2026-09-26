import { Bot, type LucideIcon, MessageCircle, MessageSquare, Reply, Target, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmtNumber } from '~/lib/format';
import type { AnalyticsCount, AnalyticsOverview } from '~/types/customerAnalytics';
import { percentOf } from '../analytics';
import { ChangeLabel } from './ChangeLabel';

type CountKey = 'newContacts' | 'inboundMessages' | 'automaticReplies' | 'manualReplies' | 'comments';

const CARDS: { key: CountKey; icon: LucideIcon }[] = [
  { key: 'newContacts', icon: UserPlus },
  { key: 'inboundMessages', icon: MessageSquare },
  { key: 'automaticReplies', icon: Bot },
  { key: 'manualReplies', icon: Reply },
  { key: 'comments', icon: MessageCircle },
];

export function StatCards({ overview }: { overview: AnalyticsOverview }) {
  const { t } = useTranslation('customerAuth');
  const rate = percentOf(overview.converted.current, overview.started.current);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {CARDS.map(({ key, icon }) => (
        <StatCard
          key={key}
          icon={icon}
          title={t(`analytics.cards.${key}`)}
          hint={t(`analytics.cards.${key}Hint`)}
          count={overview[key]}
        />
      ))}
      <StatCard
        icon={Target}
        title={t('analytics.cards.converted')}
        hint={
          rate === null
            ? t('analytics.cards.convertedNoStarts')
            : t('analytics.cards.convertedHint', { started: fmtNumber(overview.started.current), rate })
        }
        count={overview.converted}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  hint,
  count,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  count: AnalyticsCount;
}) {
  const { t } = useTranslation('customerAuth');
  return (
    <section aria-label={title} className="bg-card min-w-0 rounded-xl border p-3">
      <h3 className="text-muted-foreground flex items-start gap-1.5 text-xs leading-tight font-medium">
        <Icon className="mt-px size-3.5 shrink-0" />
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold tabular-nums">{fmtNumber(count.current)}</span>
        <ChangeLabel count={count} />
      </div>
      <p className="text-muted-foreground text-2xs mt-1 leading-snug">{hint}</p>
      <p className="text-muted-foreground text-2xs tabular-nums">
        {t('analytics.cards.previous', { value: fmtNumber(count.previous) })}
      </p>
    </section>
  );
}
