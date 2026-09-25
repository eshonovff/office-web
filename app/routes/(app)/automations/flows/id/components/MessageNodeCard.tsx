import type { NodeProps } from '@xyflow/react';
import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOutputPorts, type FlowCanvasNode } from '~/lib/flowGraph';
import type { MessageNodeConfig } from '~/types/flow';
import { useNodeContactCount } from './flowStatsContext';
import { NodeShell } from './NodeShell';

export function MessageNodeCard({ id, data, selected }: NodeProps<FlowCanvasNode>) {
  const { t } = useTranslation('flows');
  const contactCount = useNodeContactCount(id);
  const config = data.config as MessageNodeConfig;
  // Ҳимояи дифоъӣ: config-и маълумоти кӯҳна/вайроншуда метавонад ин майдонҳоро надошта бошад.
  const blocks = config.blocks ?? [];
  const buttons = config.buttons ?? [];
  const textBlock = blocks.find((b) => b.type === 'text');
  const firstText = textBlock?.text;
  const variantCount = (textBlock?.variants ?? []).filter((v) => v.trim()).length;
  const mediaBlock = blocks.find((b) => b.type !== 'text');
  const ports = getOutputPorts('message', { ...config, blocks, buttons });

  return (
    <NodeShell
      icon={<MessageSquareText className="h-4 w-4" />}
      accentClassName="text-blue-500"
      title={t('nodes.message')}
      selected={selected}
      contactCount={contactCount}
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
          {variantCount > 0 && (
            <p className="text-muted-foreground">{t('nodePanels.message.variantsCount', { count: variantCount })}</p>
          )}
          {mediaBlock && (
            <div className="flex items-center gap-1.5">
              {mediaBlock.previewDataUri ? (
                <img src={mediaBlock.previewDataUri} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
              ) : (
                <span>📎</span>
              )}
              <p className="text-muted-foreground">{t(`nodePanels.message.mediaType.${mediaBlock.type}`)}</p>
            </div>
          )}
        </>
      )}
    </NodeShell>
  );
}
