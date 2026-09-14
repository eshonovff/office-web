import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { commentAutomationApi } from '~/api/commentAutomation';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import type { AutomationMatchMode, AutomationPostScope } from '~/types/commentAutomation';

interface DryRunPanelProps {
  channelId: string;
  matchMode: AutomationMatchMode;
  keywords: string[];
  postScope: AutomationPostScope;
  postIds: string[];
}

/**
 * "Ин санҷиш аст, на иҷро" — ҳеҷ дархост ба Meta намеравад ва ҳеҷ чиз захира намешавад
 * (endpoint-и dry-run stateless аст, ниг. CommentAutomationEndpoints.DryRunAsync).
 */
export function DryRunPanel({ channelId, matchMode, keywords, postScope, postIds }: DryRunPanelProps) {
  const { t } = useTranslation('instagramAutomation');
  const [commentText, setCommentText] = useState('');

  const { mutate, data, isPending } = useMutation({
    mutationFn: () =>
      commentAutomationApi.dryRun(channelId, {
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
      }),
  });

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">{t('dryRun.title')}</p>
      <p className="text-muted-foreground text-2xs">{t('dryRun.notice')}</p>
      <Textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder={t('dryRun.placeholder')}
        rows={2}
      />
      <Button type="button" variant="outline" size="sm" disabled={isPending || !commentText.trim()} onClick={() => mutate()}>
        {t('dryRun.run')}
      </Button>

      {data && (
        <p className={data.matched ? 'text-sm text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground text-sm'}>
          {data.matched
            ? t('dryRun.matched', { keyword: data.matchedKeyword ?? t('dryRun.anyComment') })
            : t('dryRun.notMatched')}
        </p>
      )}
    </div>
  );
}
