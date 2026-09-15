import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import type { MessageButton, MessageNodeConfig } from '~/types/flow';

interface MessageNodePanelProps {
  config: MessageNodeConfig;
  onChange: (config: MessageNodeConfig) => void;
}

// Canvas-и ин фаза танҳо блоки якуми матниро таҳрир мекунад — backend худаш блокҳои
// ғайри-матниро (расм/видео/файл) нодида мегирад чунки ба media_id-и аллакай боркардашуда
// ниёз доранд ва UI-и боркунӣ ҳанӯз нест (ниг. FlowEngine.ExecuteMessageNodeAsync).
export function MessageNodePanel({ config, onChange }: MessageNodePanelProps) {
  const { t } = useTranslation('flows');
  const text = config.blocks.find((b) => b.type === 'text')?.text ?? '';

  function setText(value: string) {
    onChange({ ...config, blocks: [{ type: 'text', text: value, mediaId: null }] });
  }

  function updateButton(index: number, patch: Partial<MessageButton>) {
    const buttons = config.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange({ ...config, buttons });
  }

  function addButton() {
    if (config.buttons.length >= 3) return; // Messenger button template max
    onChange({ ...config, buttons: [...config.buttons, { title: '', action: 'next', url: null, allowRepeat: false }] });
  }

  function removeButton(index: number) {
    onChange({ ...config, buttons: config.buttons.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('nodePanels.message.textLabel')}</Label>
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('nodePanels.message.textPlaceholder')}
        />
        <p className="text-muted-foreground text-2xs">{t('nodePanels.message.interpolationHint')}</p>
      </div>

      <div className="space-y-2">
        <Label>{t('nodePanels.message.buttonsLabel')}</Label>
        {config.buttons.map((button, index) => (
          <div key={index} className="border-border space-y-2 rounded-lg border p-2.5">
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder={t('nodePanels.message.buttonTitlePlaceholder')}
                maxLength={30}
                value={button.title}
                onChange={(e) => updateButton(index, { title: e.target.value })}
              />
              <Button variant="ghost" size="icon" onClick={() => removeButton(index)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CustomSelect
              options={[
                { value: 'next', label: t('nodePanels.message.buttonAction.next') },
                { value: 'url', label: t('nodePanels.message.buttonAction.url') },
              ]}
              value={button.action}
              onChange={(v) => updateButton(index, { action: (v as 'next' | 'url') ?? 'next' })}
            />
            {button.action === 'url' && (
              <Input
                placeholder="https://..."
                value={button.url ?? ''}
                onChange={(e) => updateButton(index, { url: e.target.value })}
              />
            )}
            <label className="text-2xs flex w-fit items-center gap-2">
              <Checkbox
                checked={button.allowRepeat}
                onCheckedChange={(checked) => updateButton(index, { allowRepeat: checked === true })}
              />
              {t('nodePanels.message.allowRepeat')}
            </label>
          </div>
        ))}
        {config.buttons.length < 3 && (
          <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={addButton}>
            <Plus className="h-3.5 w-3.5" />
            {t('nodePanels.message.addButton')}
          </Button>
        )}
      </div>
    </div>
  );
}
