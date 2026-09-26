import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '~/components/ui/badge';
import { fmtNumber } from '~/lib/format';
import type { AnalyticsFlowRow } from '~/types/customerAnalytics';
import { percentOf } from '../analytics';
import { ChangeLabel } from './ChangeLabel';

const COLUMNS = 'sm:grid-cols-[minmax(0,1fr)_8rem_9rem_1rem]';

export function FlowsSection({ flows, onOpen }: { flows: AnalyticsFlowRow[]; onOpen: (flowId: string) => void }) {
  const { t } = useTranslation('customerAuth');

  return (
    <section className="bg-card min-w-0 rounded-xl border">
      <header className="border-b p-4">
        <h2 className="text-sm font-semibold">{t('analytics.flows.title')}</h2>
        <p className="text-muted-foreground text-xs">{t('analytics.flows.subtitle')}</p>
      </header>

      {flows.length === 0 ? (
        <div className="space-y-2 p-6 text-center">
          <p className="text-muted-foreground text-sm">{t('analytics.flows.empty')}</p>
          <Link to="/account/automations" className="text-primary text-sm hover:underline">
            {t('analytics.flows.open')}
          </Link>
        </div>
      ) : (
        <>
          <div
            className={`text-muted-foreground text-2xs hidden gap-3 border-b px-4 py-2 font-medium sm:grid ${COLUMNS}`}>
            <span>{t('analytics.flows.name')}</span>
            <span className="text-right">{t('analytics.flows.started')}</span>
            <span className="text-right">{t('analytics.flows.converted')}</span>
            <span />
          </div>
          <ul className="divide-y">
            {flows.map((flow) => (
              <li key={flow.flowId}>
                <FlowRow flow={flow} onOpen={onOpen} />
              </li>
            ))}
          </ul>
          {flows.some((f) => !f.hasConversionStep) && (
            <p className="text-muted-foreground text-2xs border-t px-4 py-2">{t('analytics.flows.goalTip')}</p>
          )}
        </>
      )}
    </section>
  );
}

function FlowRow({ flow, onOpen }: { flow: AnalyticsFlowRow; onOpen: (flowId: string) => void }) {
  const { t } = useTranslation('customerAuth');
  const rate = percentOf(flow.converted.current, flow.started.current);

  return (
    <button
      type="button"
      onClick={() => onOpen(flow.flowId)}
      className={`hover:bg-muted/50 grid w-full grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-3 text-left ${COLUMNS}`}>
      <span className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-1">
        <span className="truncate text-sm font-medium">{flow.name}</span>
        {!flow.isActive && <Badge variant="secondary">{t('analytics.flows.inactive')}</Badge>}
      </span>
      <span className="min-w-0 text-sm tabular-nums sm:text-right">
        <span className="text-muted-foreground text-2xs block sm:hidden">{t('analytics.flows.started')}</span>
        {fmtNumber(flow.started.current)} <ChangeLabel count={flow.started} />
      </span>
      <span className="min-w-0 text-sm tabular-nums sm:text-right">
        <span className="text-muted-foreground text-2xs block sm:hidden">{t('analytics.flows.converted')}</span>
        {flow.hasConversionStep ? (
          <>
            {fmtNumber(flow.converted.current)}
            {rate !== null && <span className="text-muted-foreground text-xs"> · {rate}%</span>}
          </>
        ) : (
          <span className="text-muted-foreground text-xs">{t('analytics.flows.noGoal')}</span>
        )}
      </span>
      <ChevronRight className="text-muted-foreground hidden size-4 sm:block" />
    </button>
  );
}
