import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ChipInput } from '~/components/shared/ChipInput';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { FormTextarea } from '~/components/ui/form/FormTextarea';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useForm } from '~/hooks/useForm';
import { commentAutomationRuleSchema, type CommentAutomationRuleForm } from '~/validations/commentAutomationRule';
import type { AutomationRuleListItem, CreateAutomationRuleRequest } from '~/types/commentAutomation';
import { DryRunPanel } from './DryRunPanel';
import { MediaPickerModal } from './MediaPickerModal';

interface RuleFormModalProps {
  channelId: string;
  rule?: AutomationRuleListItem;
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateAutomationRuleRequest) => void;
  isSaving: boolean;
}

export function RuleFormModal({ channelId, rule, open, onClose, onSave, isSaving }: RuleFormModalProps) {
  const { t } = useTranslation(['instagramAutomation', 'validation', 'common']);
  const { t: tVal } = useTranslation('validation');
  const [pickingMedia, setPickingMedia] = useState(false);

  const { control, handleSubmit, watch, setValue } = useForm<CommentAutomationRuleForm>({
    resolver: zodResolver(commentAutomationRuleSchema(tVal)),
    values: {
      name: rule?.name ?? '',
      matchMode: rule?.triggerConfig.matchMode ?? 'keyword',
      keywords: rule?.triggerConfig.keywords ?? [],
      postScope: rule?.triggerConfig.postScope ?? 'all',
      postIds: rule?.triggerConfig.postIds ?? [],
      commentReplies: rule?.actionConfig.commentReplies ?? [''],
      dmText: rule?.actionConfig.dmText ?? '',
      dmButtonUrl: rule?.actionConfig.dmButtonUrl ?? '',
      dmButtonTitle: rule?.actionConfig.dmButtonTitle ?? '',
      cooldownMinutes: String(rule?.cooldownMinutes ?? 60),
    },
  });

  const matchMode = watch('matchMode');
  const postScope = watch('postScope');
  const postIds = watch('postIds');
  const keywords = watch('keywords');
  const dmButtonUrl = watch('dmButtonUrl');

  function submit(data: CommentAutomationRuleForm) {
    onSave({
      name: data.name,
      cooldownMinutes: Number(data.cooldownMinutes),
      triggerConfig: {
        matchMode: data.matchMode,
        keywords: data.keywords.filter((k) => k.trim()),
        postScope: data.postScope,
        postIds: data.postIds,
      },
      actionConfig: {
        commentReplies: data.commentReplies.filter((r) => r.trim()),
        dmText: data.dmText,
        dmButtonUrl: data.dmButtonUrl?.trim() || null,
        dmButtonTitle: data.dmButtonUrl?.trim() ? data.dmButtonTitle?.trim() || null : null,
      },
    });
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={rule ? t('editRule') : t('createRule')}
        className="sm:max-w-2xl"
        footer={
          <Button type="submit" form="automation-rule-form" disabled={isSaving}>
            {t('actions.save', { ns: 'common' })}
          </Button>
        }>
        <form id="automation-rule-form" className="space-y-4" onSubmit={handleSubmit(submit)}>
          <FormInput control={control} name="name" label={t('fields.name')} required />

          <div className="space-y-1.5">
            <Label>{t('fields.matchMode')}</Label>
            <Controller
              control={control}
              name="matchMode"
              render={({ field }) => (
                <CustomSelect
                  options={[
                    { value: 'keyword', label: t('matchMode.keyword') },
                    { value: 'all', label: t('matchMode.all') },
                  ]}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? 'keyword')}
                />
              )}
            />
            {matchMode === 'all' && <p className="text-destructive text-2xs">{t('matchModeAllWarning')}</p>}
          </div>

          {matchMode === 'keyword' && (
            <div className="space-y-1.5">
              <Label>{t('fields.keywords')}</Label>
              <Controller control={control} name="keywords" render={({ field }) => <ChipInput value={field.value} onChange={field.onChange} />} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t('fields.postScope')}</Label>
            <Controller
              control={control}
              name="postScope"
              render={({ field }) => (
                <CustomSelect
                  options={[
                    { value: 'all', label: t('postScope.all') },
                    { value: 'selected', label: t('postScope.selected') },
                  ]}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? 'all')}
                />
              )}
            />
            {postScope === 'selected' && (
              <div className="flex items-center gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setPickingMedia(true)}>
                  {t('choosePosts')}
                </Button>
                <span className="text-muted-foreground text-2xs">{t('postsSelectedCount', { count: postIds.length })}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t('fields.commentReplies')}</Label>
            <Controller
              control={control}
              name="commentReplies"
              render={({ field }) => (
                <div className="space-y-2">
                  {field.value.map((reply, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={reply}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = e.target.value;
                          field.onChange(next);
                        }}
                        placeholder={t('commentReplyPlaceholder')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={field.value.length <= 1}
                        onClick={() => field.onChange(field.value.filter((_, i) => i !== index))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => field.onChange([...field.value, ''])}>
                    <Plus className="h-3.5 w-3.5" />
                    {t('addReply')}
                  </Button>
                </div>
              )}
            />
          </div>

          <FormTextarea control={control} name="dmText" label={t('fields.dmText')} required rows={3} />
          <FormInput control={control} name="dmButtonUrl" label={t('fields.dmButtonUrl')} placeholder="https://..." />
          {dmButtonUrl?.trim() && (
            <FormInput control={control} name="dmButtonTitle" label={t('fields.dmButtonTitle')} maxLength={20} required />
          )}
          <FormInput control={control} name="cooldownMinutes" type="number" min={0} label={t('fields.cooldownMinutes')} required />

          <DryRunPanel channelId={channelId} matchMode={matchMode} keywords={keywords} postScope={postScope} postIds={postIds} />
        </form>
      </Modal>

      {pickingMedia && (
        <MediaPickerModal
          channelId={channelId}
          open={pickingMedia}
          selectedIds={postIds}
          onClose={() => setPickingMedia(false)}
          onConfirm={(ids) => {
            setValue('postIds', ids, { shouldValidate: true });
            setPickingMedia(false);
          }}
        />
      )}
    </>
  );
}
