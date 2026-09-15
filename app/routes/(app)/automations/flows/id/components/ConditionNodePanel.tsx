import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type { ConditionNodeConfig, ConditionOp, ConditionRule } from '~/types/flow';

const FIXED_FIELDS = ['subscription', 'tags', 'time', 'date', 'weekday'] as const;
type FixedField = (typeof FIXED_FIELDS)[number];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function isFixedField(field: string): field is FixedField {
  return (FIXED_FIELDS as readonly string[]).includes(field);
}

function defaultOpFor(field: string): ConditionOp {
  if (field === 'tags') return 'has';
  if (field === 'time' || field === 'date') return 'after';
  return 'equals';
}

interface ConditionNodePanelProps {
  config: ConditionNodeConfig;
  onChange: (config: ConditionNodeConfig) => void;
}

export function ConditionNodePanel({ config, onChange }: ConditionNodePanelProps) {
  const { t } = useTranslation('flows');
  // Ҳимояи дифоъӣ: config-и маълумоти кӯҳна/вайроншуда метавонад ин майдонҳоро надошта бошад.
  const rules = config.rules ?? [];
  const match = config.match ?? 'all';

  function updateRule(index: number, patch: Partial<ConditionRule>) {
    onChange({ ...config, rules: rules.map((r, i) => (i === index ? { ...r, ...patch } : r)) });
  }

  function addRule() {
    onChange({ ...config, rules: [...rules, { field: 'subscription', op: 'equals', value: '' }] });
  }

  function removeRule(index: number) {
    onChange({ ...config, rules: rules.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('nodePanels.condition.matchLabel')}</Label>
        <CustomSelect
          options={[
            { value: 'all', label: t('nodePanels.condition.matchAll') },
            { value: 'any', label: t('nodePanels.condition.matchAny') },
          ]}
          value={match}
          onChange={(v) => onChange({ ...config, match: (v as 'all' | 'any') ?? 'all' })}
        />
      </div>

      <div className="space-y-3">
        {rules.map((rule, index) => {
          const field = isFixedField(rule.field) ? rule.field : 'variable';
          return (
            <div key={index} className="border-border space-y-2 rounded-lg border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <CustomSelect
                  className="flex-1"
                  options={[
                    ...FIXED_FIELDS.map((f) => ({ value: f, label: t(`nodePanels.condition.field.${f}`) })),
                    { value: 'variable', label: t('nodePanels.condition.field.variable') },
                  ]}
                  value={field}
                  onChange={(v) => {
                    const nextField = (v as string) ?? 'subscription';
                    updateRule(index, {
                      field: nextField === 'variable' ? '' : nextField,
                      op: defaultOpFor(nextField),
                      value: '',
                    });
                  }}
                />
                <Button variant="ghost" size="icon" onClick={() => removeRule(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {field === 'variable' && (
                <Input
                  placeholder={t('nodePanels.condition.variableNamePlaceholder')}
                  value={rule.field}
                  onChange={(e) => updateRule(index, { field: e.target.value })}
                />
              )}

              {field === 'subscription' && (
                <p className="text-muted-foreground text-2xs">{t('nodePanels.condition.subscriptionHint')}</p>
              )}

              {field === 'tags' && (
                <div className="flex gap-2">
                  <CustomSelect
                    className="w-32"
                    options={[
                      { value: 'has', label: t('nodePanels.condition.op.has') },
                      { value: 'not_has', label: t('nodePanels.condition.op.not_has') },
                    ]}
                    value={rule.op}
                    onChange={(v) => updateRule(index, { op: (v as ConditionOp) ?? 'has' })}
                  />
                  <Input
                    className="flex-1"
                    placeholder={t('nodePanels.condition.tagPlaceholder')}
                    value={rule.value}
                    onChange={(e) => updateRule(index, { value: e.target.value })}
                  />
                </div>
              )}

              {field === 'time' && (
                <div className="flex gap-2">
                  <CustomSelect
                    className="w-32"
                    options={[
                      { value: 'after', label: t('nodePanels.condition.op.after') },
                      { value: 'before', label: t('nodePanels.condition.op.before') },
                    ]}
                    value={rule.op}
                    onChange={(v) => updateRule(index, { op: (v as ConditionOp) ?? 'after' })}
                  />
                  <Input
                    className="flex-1"
                    type="time"
                    value={rule.value}
                    onChange={(e) => updateRule(index, { value: e.target.value })}
                  />
                </div>
              )}

              {field === 'date' && (
                <div className="flex gap-2">
                  <CustomSelect
                    className="w-32"
                    options={[
                      { value: 'equals', label: t('nodePanels.condition.op.equals') },
                      { value: 'after', label: t('nodePanels.condition.op.after') },
                      { value: 'before', label: t('nodePanels.condition.op.before') },
                    ]}
                    value={rule.op}
                    onChange={(v) => updateRule(index, { op: (v as ConditionOp) ?? 'equals' })}
                  />
                  <Input
                    className="flex-1"
                    type="date"
                    value={rule.value}
                    onChange={(e) => updateRule(index, { value: e.target.value })}
                  />
                </div>
              )}

              {field === 'weekday' && (
                <div className="flex gap-2">
                  <CustomSelect
                    className="w-32"
                    options={[
                      { value: 'equals', label: t('nodePanels.condition.op.equals') },
                      { value: 'not_equals', label: t('nodePanels.condition.op.not_equals') },
                    ]}
                    value={rule.op}
                    onChange={(v) => updateRule(index, { op: (v as ConditionOp) ?? 'equals' })}
                  />
                  <CustomSelect
                    className="flex-1"
                    options={WEEKDAYS.map((day) => ({ value: day, label: t(`nodePanels.condition.weekday.${day}`) }))}
                    value={rule.value || null}
                    onChange={(v) => updateRule(index, { value: (v as string) ?? '' })}
                  />
                </div>
              )}

              {field === 'variable' && (
                <div className="flex gap-2">
                  <CustomSelect
                    className="w-32"
                    options={[
                      { value: 'equals', label: t('nodePanels.condition.op.equals') },
                      { value: 'not_equals', label: t('nodePanels.condition.op.not_equals') },
                      { value: 'contains', label: t('nodePanels.condition.op.contains') },
                    ]}
                    value={rule.op}
                    onChange={(v) => updateRule(index, { op: (v as ConditionOp) ?? 'equals' })}
                  />
                  <Input
                    className="flex-1"
                    placeholder={t('nodePanels.condition.valuePlaceholder')}
                    value={rule.value}
                    onChange={(e) => updateRule(index, { value: e.target.value })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={addRule}>
        <Plus className="h-3.5 w-3.5" />
        {t('nodePanels.condition.addRule')}
      </Button>
    </div>
  );
}
