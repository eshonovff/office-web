import type { NodeProps } from '@xyflow/react';
import { StickyNote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FlowCanvasNode } from '~/lib/flowGraph';
import type { NoteNodeConfig } from '~/types/flow';
import { NodeShell } from './NodeShell';

// Notes are canvas-only annotations — never part of execution (ниг. FlowEngine's Note
// case, which just no-ops if one is ever reached), so no target/source handles at all.
export function NoteNodeCard({ data, selected }: NodeProps<FlowCanvasNode>) {
  const { t } = useTranslation('flows');
  const config = data.config as NoteNodeConfig;

  return (
    <NodeShell
      icon={<StickyNote className="h-4 w-4" />}
      accentClassName="text-yellow-500"
      title={t('nodes.note')}
      selected={selected}
      hasTarget={false}
      outputs={[]}>
      <p className="whitespace-pre-wrap">{config.text || t('nodePanels.note.empty')}</p>
    </NodeShell>
  );
}
