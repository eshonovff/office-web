import type { NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOutputPorts, type FlowCanvasNode } from '~/lib/flowGraph';
import type { ActionNodeConfig } from '~/types/flow';
import { NodeShell } from './NodeShell';

export function ActionNodeCard({ data, selected }: NodeProps<FlowCanvasNode>) {
  const { t } = useTranslation('flows');
  const config = data.config as ActionNodeConfig;
  const ports = getOutputPorts('action', config);

  return (
    <NodeShell
      icon={<Zap className="h-4 w-4" />}
      accentClassName="text-violet-500"
      title={t(`nodePanels.action.kind.${config.kind}`, { defaultValue: t('nodes.action') })}
      selected={selected}
      outputs={ports.length > 0 ? [{ id: ports[0], label: t('nodePanels.continue') }] : []}>
      <ActionSummary config={config} />
    </NodeShell>
  );
}

function ActionSummary({ config }: { config: ActionNodeConfig }) {
  const { t } = useTranslation('flows');
  switch (config.kind) {
    case 'delay':
      return <p>{t('nodePanels.action.summary.delay', { count: config.delayMinutes ?? 0 })}</p>;
    case 'add_tags':
    case 'remove_tags':
      return <p>{(config.tags ?? []).join(', ') || t('nodePanels.action.empty')}</p>;
    case 'set_variable':
      return (
        <p>
          {config.variableKey ? `${config.variableKey} = ${config.variableValue ?? ''}` : t('nodePanels.action.empty')}
        </p>
      );
    case 'collect_input':
      return (
        <p>
          {config.variableKey
            ? t('nodePanels.action.summary.collectInput', { key: config.variableKey })
            : t('nodePanels.action.empty')}
        </p>
      );
    case 'http_request':
      return <p className="truncate">{config.httpUrl || t('nodePanels.action.empty')}</p>;
    case 'goto_flow':
      return <p>{t('nodePanels.action.summary.gotoFlow')}</p>;
    default:
      return null;
  }
}
