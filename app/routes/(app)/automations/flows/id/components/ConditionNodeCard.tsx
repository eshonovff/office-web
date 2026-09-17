import type { NodeProps } from '@xyflow/react';
import { GitFork } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOW_PORT_MATCH, FLOW_PORT_NOMATCH, type ConditionNodeConfig } from '~/types/flow';
import type { FlowCanvasNode } from '~/lib/flowGraph';
import { useNodeContactCount } from './flowStatsContext';
import { NodeShell } from './NodeShell';

export function ConditionNodeCard({ id, data, selected }: NodeProps<FlowCanvasNode>) {
  const { t } = useTranslation('flows');
  const contactCount = useNodeContactCount(id);
  const config = data.config as ConditionNodeConfig;
  // Ҳимояи дифоъӣ: агар config-и як нод (маълумоти кӯҳна/вайроншуда) майдонҳои
  // интизоршударо надошта бошад, як карта набояд тамоми canvas-ро бишиканад.
  const rules = config.rules ?? [];
  const match = config.match ?? 'all';

  return (
    <NodeShell
      icon={<GitFork className="h-4 w-4" />}
      accentClassName="text-amber-500"
      title={t('nodes.condition')}
      selected={selected}
      contactCount={contactCount}
      outputs={[
        { id: FLOW_PORT_MATCH, label: t('nodePanels.condition.match') },
        { id: FLOW_PORT_NOMATCH, label: t('nodePanels.condition.nomatch') },
      ]}>
      {rules.length === 0 ? (
        <p className="italic">{t('nodePanels.condition.empty')}</p>
      ) : (
        <p>{t(`nodePanels.condition.summary.${match}`, { count: rules.length })}</p>
      )}
    </NodeShell>
  );
}
