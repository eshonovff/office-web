import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { MAX_PUBLIC_REPLIES, MAX_PUBLIC_REPLY_LENGTH } from '~/lib/publicReplies';

interface PublicRepliesFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * A comment trigger's optional public reply under the comment ("sent you a DM 📩"). Several
 * variants are used in turn — the same text under every comment looks like spam to Instagram.
 * Off = an empty list.
 */
export function PublicRepliesField({ value, onChange }: PublicRepliesFieldProps) {
  const { t } = useTranslation('automations');
  const enabled = value.length > 0;
  const defaults = [t('publicReplies.default1'), t('publicReplies.default2'), t('publicReplies.default3')];

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="public-replies-toggle">{t('publicReplies.toggle')}</Label>
        <Switch id="public-replies-toggle" checked={enabled} onCheckedChange={(on) => onChange(on ? defaults : [])} />
      </div>
      <p className="text-muted-foreground text-2xs">{t('publicReplies.hint')}</p>

      {enabled && (
        <div className="space-y-1.5">
          {value.map((reply, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Input
                value={reply}
                maxLength={MAX_PUBLIC_REPLY_LENGTH}
                aria-label={t('publicReplies.variant', { number: index + 1 })}
                onChange={(e) => onChange(value.map((r, i) => (i === index ? e.target.value : r)))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('publicReplies.remove')}
                disabled={value.length === 1}
                onClick={() => onChange(value.filter((_, i) => i !== index))}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {value.length < MAX_PUBLIC_REPLIES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onChange([...value, ''])}>
              <Plus className="size-3.5" />
              {t('publicReplies.add')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
