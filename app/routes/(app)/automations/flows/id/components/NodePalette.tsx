import { GitFork, MessageSquareText, StickyNote, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import type { FlowNodeType } from '~/types/flow';

const PALETTE_ITEMS: { type: FlowNodeType; icon: ReactNode }[] = [
  { type: 'message', icon: <MessageSquareText className="h-3.5 w-3.5" /> },
  { type: 'condition', icon: <GitFork className="h-3.5 w-3.5" /> },
  { type: 'action', icon: <Zap className="h-3.5 w-3.5" /> },
  { type: 'note', icon: <StickyNote className="h-3.5 w-3.5" /> },
];

interface NodePaletteProps {
  onAdd: (type: FlowNodeType) => void;
}

export function NodePalette({ onAdd }: NodePaletteProps) {
  const { t } = useTranslation('flows');
  return (
    <div className="bg-sidebar border-border flex gap-1.5 rounded-lg border p-1.5 shadow-sm">
      {PALETTE_ITEMS.map((item) => (
        <Button
          key={item.type}
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onAdd(item.type)}>
          {item.icon}
          {t(`nodes.${item.type}`)}
        </Button>
      ))}
    </div>
  );
}
