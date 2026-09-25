import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { TriggerConfigFields } from '~/components/shared/TriggerConfigFields';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { FormInput } from '~/components/ui/form/FormInput';
import { FormTextarea } from '~/components/ui/form/FormTextarea';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useForm } from '~/hooks/useForm';
import { commentAutomationRuleSchema, type CommentAutomationRuleForm } from '~/validations/commentAutomationRule';
import type { AutomationRuleListItem, CreateAutomationRuleRequest } from '~/types/commentAutomation';
import { DryRunPanel } from './DryRunPanel';

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

  const { control, handleSubmit, watch, setValue } = useForm<CommentAutomationRuleForm>({
    resolver: zodResolver(commentAutomationRuleSchema(tVal)),
    values: {
      name: rule?.name ?? '',
      matchMode: rule?.triggerConfig.matchMode ?? 'keyword',
      keywords: rule?.triggerConfig.keywords ?? [],
      postScope: rule?.triggerConfig.postScope ?? 'all',
      postIds: rule?.triggerConfig.postIds ?? [],
      commentReplies: rule?.actionConfig.onMatch.commentReplies ?? [''],
      sendDm: rule ? !!rule.actionConfig.onMatch.dmText : true,
      dmText: rule?.actionConfig.onMatch.dmText ?? '',
      dmButtonUrl: rule?.actionConfig.onMatch.dmButtonUrl ?? '',
      dmButtonTitle: rule?.actionConfig.onMatch.dmButtonTitle ?? '',
      cooldownMinutes: String(rule?.cooldownMinutes ?? 60),
      requiresFollow: rule?.conditionConfig.requiresFollow ?? false,
      notFollowingCommentReplies: rule?.actionConfig.onNotFollowing?.commentReplies ?? [''],
      notFollowingSendDm: rule?.actionConfig.onNotFollowing ? !!rule.actionConfig.onNotFollowing.dmText : true,
      notFollowingDmText: rule?.actionConfig.onNotFollowing?.dmText ?? '',
    },
  });

  const matchMode = watch('matchMode');
  const postScope = watch('postScope');
  const postIds = watch('postIds');
  const keywords = watch('keywords');
  const sendDm = watch('sendDm');
  const dmButtonUrl = watch('dmButtonUrl');
  const requiresFollow = watch('requiresFollow');
  const notFollowingSendDm = watch('notFollowingSendDm');

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
      conditionConfig: { requiresFollow: data.requiresFollow },
      actionConfig: {
        onMatch: {
          commentReplies: data.commentReplies.filter((r) => r.trim()),
          dmText: data.sendDm ? (data.dmText ?? '') : '',
          dmButtonUrl: data.sendDm ? data.dmButtonUrl?.trim() || null : null,
          dmButtonTitle: data.sendDm && data.dmButtonUrl?.trim() ? data.dmButtonTitle?.trim() || null : null,
        },
        onNotFollowing: data.requiresFollow
          ? {
              commentReplies: data.notFollowingCommentReplies.filter((r) => r.trim()),
              dmText: data.notFollowingSendDm ? (data.notFollowingDmText ?? '') : '',
              dmButtonUrl: null,
              dmButtonTitle: null,
            }
          : null,
      },
    });
  }

  return (
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

        <TriggerConfigFields
          channelId={channelId}
          matchMode={matchMode}
          onMatchModeChange={(v) => setValue('matchMode', v, { shouldValidate: true })}
          keywords={keywords}
          onKeywordsChange={(v) => setValue('keywords', v, { shouldValidate: true })}
          postScope={postScope}
          onPostScopeChange={(v) => setValue('postScope', v, { shouldValidate: true })}
          postIds={postIds}
          onPostIdsChange={(v) => setValue('postIds', v, { shouldValidate: true })}
        />

        <div className="border-border space-y-1.5 rounded-lg border p-3">
          <Controller
            control={control}
            name="requiresFollow"
            render={({ field }) => (
              <label className="flex w-fit items-center gap-2 text-sm font-medium">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                {t('condition.requiresFollow')}
              </label>
            )}
          />
          <p className="text-muted-foreground text-2xs">{t('condition.hint')}</p>
        </div>

        <ReplyListField
          control={control}
          name="commentReplies"
          label={requiresFollow ? t('fields.onMatchCommentReplies') : t('fields.commentReplies')}
          addLabel={t('addReply')}
          placeholder={t('commentReplyPlaceholder')}
        />

        <Controller
          control={control}
          name="sendDm"
          render={({ field }) => (
            <label className="flex w-fit items-center gap-2 text-sm">
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              {t('sendDm')}
            </label>
          )}
        />
        {sendDm && (
          <>
            <FormTextarea
              control={control}
              name="dmText"
              label={requiresFollow ? t('fields.onMatchDmText') : t('fields.dmText')}
              required
              rows={3}
            />
            <FormInput control={control} name="dmButtonUrl" label={t('fields.dmButtonUrl')} placeholder="https://..." />
            {dmButtonUrl?.trim() && (
              <FormInput
                control={control}
                name="dmButtonTitle"
                label={t('fields.dmButtonTitle')}
                maxLength={20}
                required
              />
            )}
          </>
        )}

        {requiresFollow && (
          <div className="border-border space-y-4 rounded-lg border p-3">
            <p className="text-sm font-medium">{t('condition.notFollowingSectionTitle')}</p>
            <ReplyListField
              control={control}
              name="notFollowingCommentReplies"
              label={t('fields.notFollowingCommentReplies')}
              addLabel={t('addReply')}
              placeholder={t('commentReplyPlaceholder')}
            />
            <Controller
              control={control}
              name="notFollowingSendDm"
              render={({ field }) => (
                <label className="flex w-fit items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  {t('sendDm')}
                </label>
              )}
            />
            {notFollowingSendDm && (
              <FormTextarea
                control={control}
                name="notFollowingDmText"
                label={t('fields.notFollowingDmText')}
                required
                rows={3}
              />
            )}
          </div>
        )}

        <FormInput
          control={control}
          name="cooldownMinutes"
          type="number"
          min={0}
          label={t('fields.cooldownMinutes')}
          required
        />

        <DryRunPanel
          channelId={channelId}
          matchMode={matchMode}
          keywords={keywords}
          postScope={postScope}
          postIds={postIds}
          requiresFollow={requiresFollow}
        />
      </form>
    </Modal>
  );
}

interface ReplyListFieldProps {
  control: Control<CommentAutomationRuleForm>;
  name: 'commentReplies' | 'notFollowingCommentReplies';
  label: string;
  addLabel: string;
  placeholder: string;
}

// Рӯйхати такрории матнҳои ҷавоб (+ илова/нест) — истифода барои ҳам OnMatch, ҳам OnNotFollowing.
function ReplyListField({ control, name, label, addLabel, placeholder }: ReplyListFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
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
                  placeholder={placeholder}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => field.onChange([...field.value, ''])}>
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          </div>
        )}
      />
    </div>
  );
}
