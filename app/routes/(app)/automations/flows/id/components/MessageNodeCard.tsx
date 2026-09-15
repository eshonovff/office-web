import type { NodeProps } from '@xyflow/react';
import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOutputPorts, type FlowCanvasNode } from '~/lib/flowGraph';
import type { MessageNodeConfig } from '~/types/flow';
import { NodeShell } from './NodeShell';

export function MessageNodeCard({ data, selected }: NodeProps<FlowCanvasNode>) {
  const { t } = useTranslation('flows');
  const config = data.config as MessageNodeConfig;
  const firstText = config.blocks.find((b) => b.type === 'text')?.text;
  const ports = getOutputPorts('message', config);

  return (
    <NodeShell
      icon={<MessageSquareText className="h-4 w-4" />}
      accentClassName="text-blue-500"
      title={t('nodes.message')}
      selected={selected}
      outputs={
        config.buttons.length > 0
          ? config.buttons.map((button, index) => ({
              id: ports[index],
              label: button.title || t('nodePanels.message.untitledButton'),
            }))
          : [{ id: 'default', label: t('nodePanels.continue') }]
      }>
      {config.blocks.length === 0 ? (
        <p className="italic">{t('nodePanels.message.empty')}</p>
      ) : (
        <>
          {firstText && <p className="line-clamp-3">{firstText}</p>}
          {config.blocks.length > 1 && <p>{t('nodePanels.message.blockCount', { count: config.blocks.length })}</p>}
        </>
      )}
    </NodeShell>
  );
}
