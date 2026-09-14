import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, PowerOff, Power } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { channelsApi } from '~/api/channels';
import { commentAutomationApi } from '~/api/commentAutomation';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { EmptyState } from '~/components/shared/EmptyState';
import { Panel } from '~/components/layout/Panel';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import type { AutomationRuleListItem, CreateAutomationRuleRequest } from '~/types/commentAutomation';
import { RuleFormModal } from './components/RuleFormModal';

export default function InstagramAutomationPage() {
  const { t } = useTranslation(['instagramAutomation', 'common']);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRuleListItem | null>(null);

  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: channelsApi.list });
  const instagramChannels = channels.filter((c) => c.type === 'Instagram' && c.isActive);

  const channelIdFromUrl = searchParams.get('channel');
  const channelId = channelIdFromUrl && instagramChannels.some((c) => c.id === channelIdFromUrl)
    ? channelIdFromUrl
    : (instagramChannels[0]?.id ?? null);

  function selectChannel(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('channel', id);
      return next;
    });
  }

  const {
    data: rules = [],
    isLoading,
  } = useQuery({
    queryKey: ['automation-rules', channelId],
    queryFn: () => commentAutomationApi.list(channelId!),
    enabled: !!channelId,
  });

  const invalidateRules = () => queryClient.invalidateQueries({ queryKey: ['automation-rules', channelId] });

  const { mutate: createRule, isPending: isCreating } = useMutation({
    mutationFn: (payload: CreateAutomationRuleRequest) => commentAutomationApi.create(channelId!, payload),
    onSuccess: () => {
      invalidateRules();
      toast.success(t('ruleCreated'));
      setCreating(false);
    },
  });

  const { mutate: updateRule, isPending: isSaving } = useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: string; payload: CreateAutomationRuleRequest }) =>
      commentAutomationApi.update(channelId!, ruleId, payload),
    onSuccess: () => {
      invalidateRules();
      toast.success(t('ruleUpdated'));
      setEditingRule(null);
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => commentAutomationApi.setActive(channelId!, ruleId, isActive),
    onSuccess: invalidateRules,
  });

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t('pageTitle')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {instagramChannels.length > 1 && (
            <CustomSelect
              className="w-56"
              options={instagramChannels.map((c) => ({ value: c.id, label: c.name }))}
              value={channelId}
              onChange={(value) => value && selectChannel(String(value))}
            />
          )}
          <Button onClick={() => setCreating(true)} disabled={!channelId} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('createRule')}
          </Button>
        </div>
      </div>

      {instagramChannels.length === 0 ? (
        <EmptyState message={t('noInstagramChannel')} />
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <EmptyState message={t('noRules')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <Panel key={rule.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{rule.name}</span>
                <Badge variant={rule.isActive ? 'default' : 'outline'} className="text-2xs">
                  {rule.isActive ? t('active') : t('inactive')}
                </Badge>
              </div>
              <p className="text-muted-foreground text-2xs">{t('runCount', { count: rule.runCount })}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditingRule(rule)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t('actions.edit', { ns: 'common' })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => toggleActive({ ruleId: rule.id, isActive: !rule.isActive })}>
                  {rule.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  {rule.isActive ? t('disable') : t('enable')}
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {channelId && (
        <RuleFormModal
          key="create"
          open={creating}
          channelId={channelId}
          onClose={() => setCreating(false)}
          isSaving={isCreating}
          onSave={(payload) => createRule(payload)}
        />
      )}

      {channelId && editingRule && (
        <RuleFormModal
          key={editingRule.id}
          open
          channelId={channelId}
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          isSaving={isSaving}
          onSave={(payload) => updateRule({ ruleId: editingRule.id, payload })}
        />
      )}
    </div>
  );
}
