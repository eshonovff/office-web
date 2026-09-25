import { useTranslation } from 'react-i18next';
import { Textarea } from '~/components/ui/textarea';
import type { NoteNodeConfig } from '~/types/flow';

interface NotePanelProps {
  config: NoteNodeConfig;
  onChange: (config: NoteNodeConfig) => void;
}

export function NotePanel({ config, onChange }: NotePanelProps) {
  const { t } = useTranslation('flows');
  return (
    <Textarea
      rows={6}
      value={config.text}
      onChange={(e) => onChange({ text: e.target.value })}
      placeholder={t('nodePanels.note.placeholder')}
    />
  );
}
