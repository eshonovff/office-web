import type { NodeProps } from '@xyflow/react';
import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOutputPorts, type FlowCanvasNode } from '~/lib/flowGraph';
import type { MessageNodeConfig } from '~/types/flow';
import { NodeShell } from './NodeShell';

export function MessageNodeCard({ data, selected }: NodeProps<FlowCanvasNode>) {
  const { t } = useTranslation('flows');
  const config = data.config as MessageNodeConfig;
  // Ҳимояи дифоъӣ: config-и маълумоти кӯҳна/вайроншуда метавонад ин майдонҳоро надошта бошад.
  const blocks = config.blocks ?? [];
  const buttons = config.buttons ?? [];
  const firstText = blocks.find((b) => b.type === 'text')?.text;
  const ports = getOutputPorts('message', { ...config, blocks, buttons });

  return (
    <NodeShell
      icon={<MessageSquareText className="h-4 w-4" />}
      accentClassName="text-blue-500"
      title={t('nodes.message')}
      selected={selected}
      outputs={
        buttons.length > 0
          ? buttons.map((button, index) => ({
              id: ports[index],
              label: button.title || t('nodePanels.message.untitledButton'),
            }))
          : [{ id: 'default', label: t('nodePanels.continue') }]
      }>
      {blocks.length === 0 ? (
        <p className="italic">{t('nodePanels.message.empty')}</p>
      ) : (
        <>
          {firstText && <p className="line-clamp-3">{firstText}</p>}
          {blocks.length > 1 && <p>{t('nodePanels.message.blockCount', { count: blocks.length })}</p>}
        </>
      )}
    </NodeShell>
  );
}
