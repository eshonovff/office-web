import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerCommentRuleKeys, customerCommentRulesApi } from '~/api/customerCommentRules';
import { customerFlowBuilderApi } from '~/api/customerFlows';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import { FlowBuilderApiProvider } from '~/lib/flowBuilderApi';
import { RuleFormModal } from '~/routes/(app)/automations/components/RuleFormModal';
import type { AutomationRuleListItem, CreateAutomationRuleRequest } from '~/types/commentAutomation';

interface AutoReplyRulesProps {
  channelId: string;
  /** Without a plan the rules can be seen and edited, not created or switched on — the server refuses too. */
  hasPlan: boolean;
}

// The comment auto-reply: the staff rules exactly (RuleFormModal — keywords and posts, replies
// under the comment in turn, a Direct message, the follow check), on the мизоҷ's own API. Every
// call goes to /api/public, scoped to their channels; the plan and its automation limit are the
// server's to enforce.
export function AutoReplyRules({ channelId, hasPlan }: AutoReplyRulesProps) {
  const { t } = useTranslation(['customerAuth', 'instagramAutomation', 'common']);
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AutomationRuleListItem | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: customerCommentRuleKeys.list(channelId),
    queryFn: () => customerCommentRulesApi.list(channelId),
  });
  const editing = editingId ? (rules.find((r) => r.id === editingId) ?? null) : null;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: customerCommentRuleKeys.all });

  const create = useMutation({
    mutationFn: (payload: CreateAutomationRuleRequest) => customerCommentRulesApi.create(channelId, payload),
    onSuccess: () => {
      refresh();
      toast.success(t('ruleCreated', { ns: 'instagramAutomation' }));
      setCreating(false);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateAutomationRuleRequest }) =>
      customerCommentRulesApi.update(channelId, id, payload),
    onSuccess: () => {
      refresh();
      toast.success(t('ruleUpdated', { ns: 'instagramAutomation' }));
      setEditingId(null);
    },
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      customerCommentRulesApi.setActive(channelId, id, isActive),
    onSettled: refresh, // also when refused (the plan's limit) — the switch snaps back
  });
  const remove = useMutation({
    mutationFn: (id: string) => customerCommentRulesApi.remove(channelId, id),
    onSuccess: () => {
      refresh();
      setDeleting(null);
      toast.success(t('comments.rules.deleted'));
    },
  });

  return (
    <FlowBuilderApiProvider value={customerFlowBuilderApi}>
      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold">{t('comments.rules.title')}</h2>
            <p className="text-muted-foreground text-xs">{t('comments.rules.hint')}</p>
          </div>
          <Button type="button" onClick={() => setCreating(true)} disabled={!hasPlan}>
            <Plus />
            {t('createRule', { ns: 'instagramAutomation' })}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-sm">
            <MessageSquareText className="size-6" />
            {t('noRules', { ns: 'instagramAutomation' })}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rules.map((rule) => (
              <li key={rule.id} className="flex flex-col gap-2 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium break-words">{rule.name}</p>
                  <Switch
                    checked={rule.isActive}
                    disabled={setActive.isPending || (!hasPlan && !rule.isActive)}
                    aria-label={t('comments.rules.toggle', { name: rule.name })}
                    onCheckedChange={(isActive) => setActive.mutate({ id: rule.id, isActive })}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {rule.triggerConfig.matchMode === 'keyword'
                    ? t('comments.rules.keywords', { list: rule.triggerConfig.keywords.join(', ') })
                    : t('matchMode.all', { ns: 'instagramAutomation' })}
                  {' · '}
                  {rule.triggerConfig.postScope === 'selected'
                    ? t('postsSelectedCount', { ns: 'instagramAutomation', count: rule.triggerConfig.postIds.length })
                    : t('postScope.all', { ns: 'instagramAutomation' })}
                </p>
                {rule.actionConfig.onMatch.commentReplies[0] && (
                  <p className="bg-muted/60 line-clamp-2 rounded-md px-2 py-1 text-xs break-words">
                    {rule.actionConfig.onMatch.commentReplies[0]}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  {rule.conditionConfig.requiresFollow && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t('comments.rules.followCheck')}
                    </Badge>
                  )}
                  {rule.actionConfig.onMatch.dmText && (
                    <Badge variant="outline" className="text-[10px]">
                      Direct
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-[11px]">
                    {t('runCount', { ns: 'instagramAutomation', count: rule.runCount })}
                  </span>
                </div>
                <div className="mt-auto flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditingId(rule.id)}>
                    <Pencil className="size-3.5" />
                    {t('actions.edit', { ns: 'common' })}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive gap-1.5"
                    onClick={() => setDeleting(rule)}>
                    <Trash2 className="size-3.5" />
                    {t('actions.delete', { ns: 'common' })}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <RuleFormModal
          key="create"
          open
          channelId={channelId}
          onClose={() => setCreating(false)}
          isSaving={create.isPending}
          onSave={(payload) => create.mutate(payload)}
        />
      )}
      {editing && (
        <RuleFormModal
          key={editing.id}
          open
          channelId={channelId}
          rule={editing}
          onClose={() => setEditingId(null)}
          isSaving={update.isPending}
          onSave={(payload) => update.mutate({ id: editing.id, payload })}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        type="danger"
        title={t('comments.rules.deleteTitle')}
        description={deleting ? t('comments.rules.deleteDescription', { name: deleting.name }) : undefined}
        confirmText={t('actions.delete', { ns: 'common' })}
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </FlowBuilderApiProvider>
  );
}
