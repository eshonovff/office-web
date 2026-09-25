import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { useFlowBuilderApi } from '~/lib/flowBuilderApi';
import type { AutomationMatchMode, AutomationPostScope } from '~/types/commentAutomation';

interface DryRunPanelProps {
  channelId: string;
  matchMode: AutomationMatchMode;
  keywords: string[];
  postScope: AutomationPostScope;
  postIds: string[];
  requiresFollow: boolean;
}

/**
 * "Ин санҷиш аст, на иҷро" — ҳеҷ дархост ба Meta намеравад (публикаи ҷавоб/DM) ва ҳеҷ чиз
 * захира намешавад. Истиснои ягона: агар "Танҳо барои обунашудагон" фаъол бошад ва корбар
 * ID-и actor-ро диҳад, санҷиши обуна ВОҚЕАН иҷро мешавад (хонданӣ, кэшдор — ниг.
 * CommentAutomationEndpoints.DryRunAsync) то маълум шавад кадом шоха кор мекунад.
 */
export function DryRunPanel({ channelId, matchMode, keywords, postScope, postIds, requiresFollow }: DryRunPanelProps) {
  const { t } = useTranslation('instagramAutomation');
  const [commentText, setCommentText] = useState('');
  const [actorId, setActorId] = useState('');
  // Staff or мизоҷ API — whichever area the rule form is in (FlowBuilderApiProvider).
  const { dryRunRule } = useFlowBuilderApi();

  const { mutate, data, isPending } = useMutation({
    mutationFn: () =>
      dryRunRule(channelId, {
        triggerConfig: {
          matchMode,
          keywords: keywords.filter((k) => k.trim()),
          postScope,
          // No specific post is being tested against here — simulate against the first selected
          // post (if any) so a "selected posts" rule can still be dry-run without extra UI.
          postIds,
        },
        commentText,
        mediaId: postScope === 'selected' ? (postIds[0] ?? null) : null,
        conditionConfig: { requiresFollow },
        actorExternalId: actorId.trim() || null,
      }),
  });

  return (
    <div className="border-border space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">{t('dryRun.title')}</p>
      <p className="text-muted-foreground text-2xs">{t('dryRun.notice')}</p>
      <Textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder={t('dryRun.placeholder')}
        rows={2}
      />
      {requiresFollow && (
        <div className="space-y-1">
          <Input
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            placeholder={t('dryRun.actorIdPlaceholder')}
          />
          <p className="text-muted-foreground text-2xs">{t('dryRun.actorIdHint')}</p>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending || !commentText.trim()}
        onClick={() => mutate()}>
        {t('dryRun.run')}
      </Button>

      {data && (
        <div className="space-y-1">
          <p
            className={
              data.matched ? 'text-sm text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground text-sm'
            }>
            {data.matched
              ? t('dryRun.matched', { keyword: data.matchedKeyword ?? t('dryRun.anyComment') })
              : t('dryRun.notMatched')}
          </p>
          {data.matched && requiresFollow && (
            <p className="text-muted-foreground text-2xs">
              {data.followCheckResult
                ? t(`dryRun.followResult.${data.followCheckResult}` as const)
                : t('dryRun.followResultSkipped')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
