import { useMutation, useQuery } from '@tanstack/react-query';
import { useFlowBuilderApi } from '~/lib/flowBuilderApi';
import { ArrowLeft, FileText, GitBranch } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Modal } from '~/components/shared/Modal';
import { PublicRepliesField } from '~/components/shared/PublicRepliesField';
import { TriggerConfigFields } from '~/components/shared/TriggerConfigFields';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Skeleton } from '~/components/ui/skeleton';
import { publicRepliesValid } from '~/lib/publicReplies';
import type { AutomationMatchMode, AutomationPostScope } from '~/types/commentAutomation';
import { FLOW_TRIGGER_TYPES, type FlowDetail, type FlowTemplateListItem, type FlowTriggerType } from '~/types/flow';

const BLANK = 'blank' as const;

interface TemplatePickerModalProps {
  channelId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (flow: FlowDetail) => void;
}

export function TemplatePickerModal({ channelId, open, onClose, onCreated }: TemplatePickerModalProps) {
  const flowApi = useFlowBuilderApi();
  const { t } = useTranslation(['automations', 'instagramAutomation', 'common']);
  const [selected, setSelected] = useState<string | typeof BLANK | null>(null);

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<FlowTriggerType>('instagram_dm');
  const [matchMode, setMatchMode] = useState<AutomationMatchMode>('keyword');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [postScope, setPostScope] = useState<AutomationPostScope>('all');
  const [postIds, setPostIds] = useState<string[]>([]);
  const [publicReplies, setPublicReplies] = useState<string[]>([]);
  const isComment = triggerType === 'instagram_comment';

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['flow-templates'],
    queryFn: flowApi.templates.list,
    enabled: open,
  });

  const { mutate: createFlow, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        triggerType,
        triggerConfig: {
          matchMode,
          keywords: keywords.filter((k) => k.trim()),
          postScope,
          postIds,
          publicReplies: isComment ? publicReplies.map((r) => r.trim()) : [],
        },
      };
      return selected === BLANK
        ? flowApi.flows.create(channelId, payload)
        : flowApi.templates.instantiate(channelId, selected!, payload);
    },
    onSuccess: (flow) => {
      toast.success(t('templatePicker.created'));
      reset();
      onCreated(flow);
    },
  });

  function reset() {
    setSelected(null);
    setName('');
    setTriggerType('instagram_dm');
    setMatchMode('keyword');
    setKeywords([]);
    setPostScope('all');
    setPostIds([]);
    setPublicReplies([]);
  }

  function close() {
    reset();
    onClose();
  }

  const canCreate =
    name.trim().length > 0 &&
    (matchMode !== 'keyword' || keywords.some((k) => k.trim())) &&
    (postScope !== 'selected' || postIds.length > 0) &&
    (!isComment || publicRepliesValid(publicReplies));

  return (
    <Modal
      open={open}
      onClose={close}
      title={selected === null ? t('templatePicker.title') : t('templatePicker.configureTitle')}
      className="sm:max-w-xl"
      footer={
        selected !== null ? (
          <div className="flex w-full items-center justify-between">
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('templatePicker.back')}
            </Button>
            <Button type="button" disabled={!canCreate || isPending} onClick={() => createFlow()}>
              {t('templatePicker.create')}
            </Button>
          </div>
        ) : undefined
      }>
      {selected === null ? (
        isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              className="border-border hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
              onClick={() => setSelected(BLANK)}>
              <GitBranch className="text-primary h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">{t('templatePicker.blankTitle')}</p>
                <p className="text-muted-foreground text-2xs">{t('templatePicker.blankHint')}</p>
              </div>
            </button>
            {templates.map((template: FlowTemplateListItem) => (
              <button
                key={template.id}
                type="button"
                className="border-border hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                onClick={() => setSelected(template.id)}>
                <FileText className="text-primary h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">{template.name}</p>
                  {template.description && <p className="text-muted-foreground text-2xs">{template.description}</p>}
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
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

          {isComment && <PublicRepliesField value={publicReplies} onChange={setPublicReplies} />}
        </div>
      )}
    </Modal>
  );
}
