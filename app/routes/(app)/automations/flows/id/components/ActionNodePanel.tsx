import { useTranslation } from 'react-i18next';
import { ChipInput } from '~/components/shared/ChipInput';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import type { ActionKind, ActionNodeConfig, FlowListItem } from '~/types/flow';

const ACTION_KINDS: ActionKind[] = [
  'delay',
  'add_tags',
  'remove_tags',
  'set_variable',
  'collect_input',
  'http_request',
  'goto_flow',
];

interface ActionNodePanelProps {
  config: ActionNodeConfig;
  flows: FlowListItem[];
  currentFlowId: string;
  onChange: (config: ActionNodeConfig) => void;
}

export function ActionNodePanel({ config, flows, currentFlowId, onChange }: ActionNodePanelProps) {
  const { t } = useTranslation('flows');

  function changeKind(kind: ActionKind) {
    // Иваз кардани kind майдонҳои дигарро тоза мекунад — то config-и кӯҳна аз навъи қаблӣ
    // намонад (масалан delayMinutes баъди гузариш ба add_tags).
    onChange({ kind });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('nodePanels.action.kindLabel')}</Label>
        <CustomSelect
          options={ACTION_KINDS.map((kind) => ({ value: kind, label: t(`nodePanels.action.kind.${kind}`) }))}
          value={config.kind}
          onChange={(v) => v && changeKind(v as ActionKind)}
        />
      </div>

      {config.kind === 'delay' && (
        <div className="space-y-1.5">
          <Label>{t('nodePanels.action.delayMinutesLabel')}</Label>
          <Input
            type="number"
            min={1}
            value={config.delayMinutes ?? ''}
            onChange={(e) => onChange({ ...config, delayMinutes: Number(e.target.value) || null })}
          />
        </div>
      )}

      {(config.kind === 'add_tags' || config.kind === 'remove_tags') && (
        <div className="space-y-1.5">
          <Label>{t('nodePanels.action.tagsLabel')}</Label>
          <ChipInput value={config.tags ?? []} onChange={(tags) => onChange({ ...config, tags })} />
        </div>
      )}

      {config.kind === 'set_variable' && (
        <>
          <div className="space-y-1.5">
            <Label>{t('nodePanels.action.variableKeyLabel')}</Label>
            <Input
              value={config.variableKey ?? ''}
              onChange={(e) => onChange({ ...config, variableKey: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('nodePanels.action.variableValueLabel')}</Label>
            <Input
              value={config.variableValue ?? ''}
              onChange={(e) => onChange({ ...config, variableValue: e.target.value })}
            />
          </div>
        </>
      )}

      {config.kind === 'collect_input' && (
        <div className="space-y-1.5">
          <Label>{t('nodePanels.action.variableKeyLabel')}</Label>
          <Input
            value={config.variableKey ?? ''}
            onChange={(e) => onChange({ ...config, variableKey: e.target.value })}
          />
          <p className="text-muted-foreground text-2xs">{t('nodePanels.action.collectInputHint')}</p>
        </div>
      )}

      {config.kind === 'http_request' && (
        <>
          <div className="space-y-1.5">
            <Label>{t('nodePanels.action.httpUrlLabel')}</Label>
            <Input
              placeholder="https://..."
              value={config.httpUrl ?? ''}
              onChange={(e) => onChange({ ...config, httpUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('nodePanels.action.httpMethodLabel')}</Label>
            <CustomSelect
              options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m }))}
              value={config.httpMethod ?? 'POST'}
              onChange={(v) => onChange({ ...config, httpMethod: (v as string) ?? 'POST' })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('nodePanels.action.httpBodyLabel')}</Label>
            <Textarea
              rows={3}
              value={config.httpBodyTemplate ?? ''}
              onChange={(e) => onChange({ ...config, httpBodyTemplate: e.target.value })}
            />
          </div>
        </>
      )}

      {config.kind === 'goto_flow' && (
        <div className="space-y-1.5">
          <Label>{t('nodePanels.action.targetFlowLabel')}</Label>
          <CustomSelect
            options={flows.filter((f) => f.id !== currentFlowId).map((f) => ({ value: f.id, label: f.name }))}
            value={config.targetFlowId ?? null}
            onChange={(v) => onChange({ ...config, targetFlowId: (v as string) ?? null })}
          />
          <p className="text-muted-foreground text-2xs">{t('nodePanels.action.gotoFlowHint')}</p>
        </div>
      )}
    </div>
  );
}
