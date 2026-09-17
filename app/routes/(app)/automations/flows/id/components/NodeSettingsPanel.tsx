import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import type { FlowCanvasNode } from '~/lib/flowGraph';
import type {
  ActionNodeConfig,
  ConditionNodeConfig,
  FlowListItem,
  FlowNodeConfig,
  MessageNodeConfig,
  NoteNodeConfig,
} from '~/types/flow';
import { ActionNodePanel } from './ActionNodePanel';
import { ConditionNodePanel } from './ConditionNodePanel';
import { MessageNodePanel } from './MessageNodePanel';
import { NotePanel } from './NotePanel';

interface NodeSettingsPanelProps {
  node: FlowCanvasNode | null;
  flowId: string;
  channelId: string;
  flows: FlowListItem[];
  nodes: FlowCanvasNode[];
  onChange: (nodeId: string, config: FlowNodeConfig) => void;
  onDelete: (nodeId: string) => void;
}

// Тағйирёбандаҳое, ки нодҳои "Гирифтани ҷавоби корбар"/"Танзими тағйирёбанда" дар ҳамин
// flow месозанд — барои рӯйхати иловаи тағйирёбандаи MessageNodePanel (ниг. ChatPlace-монанд
// "клик карда илова кун"). Тартиби иҷрои flow ба назар гирифта намешавад — соддагии қасдона.
function collectCustomVariableKeys(nodes: FlowCanvasNode[]): string[] {
  const keys = nodes
    .filter((n) => n.type === 'action')
    .map((n) => (n.data.config as ActionNodeConfig).variableKey)
    .filter((key): key is string => !!key);
  return [...new Set(keys)];
}

// Панели доимии рост — dispatcher-и алгуи FilterField.tsx: як компонент бар рӯи
// node.type шакл иваз мекунад. Sheet қасдан истифода нашуд (бо клики берун баста
// мешавад, ки дар canvas рафтори муқаррарӣ аст — кашидани edge аз як нод ба дигар).
export function NodeSettingsPanel({ node, flowId, channelId, flows, nodes, onChange, onDelete }: NodeSettingsPanelProps) {
  const { t } = useTranslation('flows');

  if (!node) {
    return (
      <aside className="border-border flex w-80 shrink-0 items-center justify-center border-l p-4">
        <p className="text-muted-foreground text-2xs text-center">{t('panel.selectHint')}</p>
      </aside>
    );
  }

  return (
    <aside className="border-border flex w-80 shrink-0 flex-col border-l">
      <div className="border-border flex items-center justify-between border-b p-3">
        <p className="text-sm font-semibold">{t(`nodes.${node.type}`)}</p>
        <Button variant="ghost" size="icon" onClick={() => onDelete(node.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {node.type === 'message' && (
          <MessageNodePanel
            config={node.data.config as MessageNodeConfig}
            channelId={channelId}
            customVariableKeys={collectCustomVariableKeys(nodes)}
            onChange={(config) => onChange(node.id, config)}
          />
        )}
        {node.type === 'condition' && (
          <ConditionNodePanel
            config={node.data.config as ConditionNodeConfig}
            onChange={(config) => onChange(node.id, config)}
          />
        )}
        {node.type === 'action' && (
          <ActionNodePanel
            config={node.data.config as ActionNodeConfig}
            flows={flows}
            currentFlowId={flowId}
            onChange={(config) => onChange(node.id, config)}
          />
        )}
        {node.type === 'note' && (
          <NotePanel config={node.data.config as NoteNodeConfig} onChange={(config) => onChange(node.id, config)} />
        )}
      </div>
    </aside>
  );
}
