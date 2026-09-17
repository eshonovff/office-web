import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { flowsApi } from '~/api/flows';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import type { FlowCanvasNode } from '~/lib/flowGraph';

interface FlowStatsPopoverProps {
  flowId: string;
  nodes: FlowCanvasNode[];
}

// PopoverContent only mounts its children while open, so this query is naturally
// lazy — no explicit enabled/refetch wiring needed.
export function FlowStatsPopover({ flowId, nodes }: FlowStatsPopoverProps) {
  const { t } = useTranslation('flows');

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {t('toolbar.stats')}
          </Button>
        }
      />
      <PopoverContent className="w-72">
        <FlowStatsBody flowId={flowId} nodes={nodes} />
      </PopoverContent>
    </Popover>
  );
}

function FlowStatsBody({ flowId, nodes }: { flowId: string; nodes: FlowCanvasNode[] }) {
  const { t } = useTranslation('flows');
  const { data: stats, isLoading } = useQuery({
    queryKey: ['flows', flowId, 'stats'],
    queryFn: () => flowsApi.stats(flowId),
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const nodeCountById = new Map(stats.nodes.map((n) => [n.nodeId, n.contactCount]));

  return (
    <div className="text-2xs space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <StatBox label={t('stats.total')} value={stats.totalSessions} />
        <StatBox label={t('stats.finished')} value={stats.finishedSessions} />
        <StatBox label={t('stats.active')} value={stats.activeOrWaitingSessions} />
        <StatBox label={t('stats.failed')} value={stats.failedSessions} />
      </div>
      {nodes.length > 0 && (
        <div className="border-border space-y-1 border-t pt-2">
          <p className="text-muted-foreground font-medium">{t('stats.perNode')}</p>
          {nodes.map((node) => (
            <div key={node.id} className="flex items-center justify-between">
              <span className="truncate">{t(`nodes.${node.type}`)}</span>
              <span className="font-medium">{nodeCountById.get(node.id) ?? 0}</span>
            </div>
          ))}
        </div>
      )}
      {stats.recentFailures.length > 0 && (
        <div className="border-border space-y-1.5 border-t pt-2">
          <p className="text-destructive font-medium">{t('stats.recentFailures')}</p>
          {stats.recentFailures.map((failure) => (
            <p key={failure.sessionId} className="text-muted-foreground border-destructive/30 border-l-2 pl-1.5">
              {failure.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border rounded-md border p-1.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
