import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Modal } from '~/components/shared/Modal';
import { TriggerConfigFields } from '~/components/shared/TriggerConfigFields';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type { AutomationMatchMode, AutomationPostScope } from '~/types/commentAutomation';
import { FLOW_TRIGGER_TYPES, type FlowDetail, type FlowTriggerType, type UpdateFlowRequest } from '~/types/flow';

interface FlowSettingsModalProps {
  channelId: string;
  flow: FlowDetail;
  open: boolean;
  onClose: () => void;
  onSave: (payload: UpdateFlowRequest) => void;
  isSaving: boolean;
}

// key={flow.id} аз route.tsx — то ҳангоми кушодан дубора аз рӯи flow-и ҷорӣ ибтидо гирад.
export function FlowSettingsModal({ channelId, flow, open, onClose, onSave, isSaving }: FlowSettingsModalProps) {
  const { t } = useTranslation(['automations', 'instagramAutomation']);
  const [name, setName] = useState(flow.name);
  const [triggerType, setTriggerType] = useState<FlowTriggerType>(flow.triggerType as FlowTriggerType);
  const [matchMode, setMatchMode] = useState<AutomationMatchMode>(flow.triggerConfig.matchMode);
  const [keywords, setKeywords] = useState<string[]>(flow.triggerConfig.keywords);
  const [postScope, setPostScope] = useState<AutomationPostScope>(flow.triggerConfig.postScope);
  const [postIds, setPostIds] = useState<string[]>(flow.triggerConfig.postIds);

  const canSave =
    name.trim().length > 0 &&
    (matchMode !== 'keyword' || keywords.some((k) => k.trim())) &&
    (postScope !== 'selected' || postIds.length > 0);

  function submit() {
    onSave({
      name,
      triggerType,
      triggerConfig: { matchMode, keywords: keywords.filter((k) => k.trim()), postScope, postIds },
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('templatePicker.configureTitle')}
      footer={
        <Button type="button" disabled={!canSave || isSaving} onClick={submit}>
          {t('actions.save', { ns: 'common' })}
        </Button>
      }>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('fields.name', { ns: 'instagramAutomation' })}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>{t('templatePicker.triggerTypeLabel')}</Label>
          <CustomSelect
            options={FLOW_TRIGGER_TYPES.map((type) => ({
              value: type,
              label: t(`templatePicker.triggerType.${type}`),
            }))}
            value={triggerType}
            onChange={(v) => v && setTriggerType(v as FlowTriggerType)}
          />
        </div>

        <TriggerConfigFields
          channelId={channelId}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
          keywords={keywords}
          onKeywordsChange={setKeywords}
          postScope={postScope}
          onPostScopeChange={setPostScope}
          postIds={postIds}
          onPostIdsChange={setPostIds}
        />
      </div>
    </Modal>
  );
}
