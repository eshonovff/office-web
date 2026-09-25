import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChipInput } from '~/components/shared/ChipInput';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import type { AutomationMatchMode, AutomationPostScope } from '~/types/commentAutomation';
import { MediaPickerModal } from '~/routes/(app)/automations/components/MediaPickerModal';

interface TriggerConfigFieldsProps {
  channelId: string;
  matchMode: AutomationMatchMode;
  onMatchModeChange: (value: AutomationMatchMode) => void;
  keywords: string[];
  onKeywordsChange: (value: string[]) => void;
  postScope: AutomationPostScope;
  onPostScopeChange: (value: AutomationPostScope) => void;
  postIds: string[];
  onPostIdsChange: (value: string[]) => void;
}

/**
 * The matchMode/keywords/postScope/postIds group shared by RuleFormModal
 * (simple automation_rules) and the flow-creation trigger picker — both
 * post to the same AutomationTriggerConfig shape backend-side. Plain
 * value/onChange props (not react-hook-form Control) so it drops into
 * either caller's form without generic-typing a sub-slice of their schema.
 */
export function TriggerConfigFields({
  channelId,
  matchMode,
  onMatchModeChange,
  keywords,
  onKeywordsChange,
  postScope,
  onPostScopeChange,
  postIds,
  onPostIdsChange,
}: TriggerConfigFieldsProps) {
  const { t } = useTranslation('instagramAutomation');
  const [pickingMedia, setPickingMedia] = useState(false);

  return (
    <>
      <div className="space-y-1.5">
        <Label>{t('fields.matchMode')}</Label>
        <CustomSelect
          options={[
            { value: 'keyword', label: t('matchMode.keyword') },
            { value: 'all', label: t('matchMode.all') },
          ]}
          value={matchMode}
          onChange={(v) => onMatchModeChange((v as AutomationMatchMode) ?? 'keyword')}
        />
        {matchMode === 'all' && <p className="text-destructive text-2xs">{t('matchModeAllWarning')}</p>}
      </div>

      {matchMode === 'keyword' && (
        <div className="space-y-1.5">
          <Label>{t('fields.keywords')}</Label>
          <ChipInput value={keywords} onChange={onKeywordsChange} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{t('fields.postScope')}</Label>
        <CustomSelect
          options={[
            { value: 'all', label: t('postScope.all') },
            { value: 'selected', label: t('postScope.selected') },
          ]}
          value={postScope}
          onChange={(v) => onPostScopeChange((v as AutomationPostScope) ?? 'all')}
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

      {pickingMedia && (
        <MediaPickerModal
          channelId={channelId}
          open={pickingMedia}
          selectedIds={postIds}
          onClose={() => setPickingMedia(false)}
          onConfirm={(ids) => {
            onPostIdsChange(ids);
            setPickingMedia(false);
          }}
        />
      )}
    </>
  );
}
