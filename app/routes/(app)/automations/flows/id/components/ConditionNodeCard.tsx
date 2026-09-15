import type { NodeProps } from '@xyflow/react';
import { GitFork } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOW_PORT_MATCH, FLOW_PORT_NOMATCH, type ConditionNodeConfig } from '~/types/flow';
import type { FlowCanvasNode } from '~/lib/flowGraph';
import { NodeShell } from './NodeShell';

export function ConditionNodeCard({ data, selected }: NodeProps<FlowCanvasNode>) {
  const { t } = useTranslation('flows');
  const config = data.config as ConditionNodeConfig;

  return (
    <NodeShell
      icon={<GitFork className="h-4 w-4" />}
      accentClassName="text-amber-500"
      title={t('nodes.condition')}
      selected={selected}
      outputs={[
        { id: FLOW_PORT_MATCH, label: t('nodePanels.condition.match') },
        { id: FLOW_PORT_NOMATCH, label: t('nodePanels.condition.nomatch') },
      ]}>
      {config.rules.length === 0 ? (
        <p className="italic">{t('nodePanels.condition.empty')}</p>
      ) : (
        <p>{t(`nodePanels.condition.summary.${config.match}`, { count: config.rules.length })}</p>
      )}
    </NodeShell>
  );
}
