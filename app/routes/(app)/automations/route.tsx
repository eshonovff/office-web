import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch, MessageSquareText, Pencil, Power, PowerOff, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { automationsApi } from '~/api/automations';
import { channelsApi } from '~/api/channels';
import { commentAutomationApi } from '~/api/commentAutomation';
import { flowsApi } from '~/api/flows';
import { CustomInput } from '~/components/shared/CustomInput';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { EmptyState } from '~/components/shared/EmptyState';
import { Panel } from '~/components/layout/Panel';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useDebounce } from '~/hooks/useDebounce';
import type { AutomationListItem, AutomationSort } from '~/types/automation';
import type { AutomationRuleListItem, CreateAutomationRuleRequest } from '~/types/commentAutomation';
import { RuleFormModal } from './components/RuleFormModal';
import { TemplatePickerModal } from './components/TemplatePickerModal';

const AUTOMATIONS_QUERY_KEY = ['automations'] as const;

export default function AutomationsPage() {
  const { t } = useTranslation(['automations', 'instagramAutomation', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [creatingRule, setCreatingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AutomationSort | undefined>(undefined);
  const debouncedSearch = useDebounce(search, 300);

  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: channelsApi.list });
  const instagramChannels = channels.filter((c) => c.type === 'Instagram' && c.isActive);

  const channelIdFromUrl = searchParams.get('channel');
  const channelId =
    channelIdFromUrl && instagramChannels.some((c) => c.id === channelIdFromUrl)
      ? channelIdFromUrl
      : (instagramChannels[0]?.id ?? null);

  function selectChannel(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('channel', id);
      return next;
    });
  }

  const { data: items = [], isLoading } = useQuery({
    queryKey: [...AUTOMATIONS_QUERY_KEY, channelId, debouncedSearch, sort],
    queryFn: () => automationsApi.list({ channelId, search: debouncedSearch, sort }),
    enabled: !!channelId,
  });

  // Full rule details (triggerConfig/actionConfig etc.) aren't part of the unified
  // AutomationListItem — GET /automations only returns summary fields for the grid.
  // RuleFormModal needs the full shape to edit, so it's fetched separately, same
  // query this page used before the union existed.
  const { data: simpleRules = [] } = useQuery({
    queryKey: ['automation-rules', channelId],
    queryFn: () => commentAutomationApi.list(channelId!),
    enabled: !!channelId,
  });
  const editingRule: AutomationRuleListItem | null = editingRuleId
    ? (simpleRules.find((r) => r.id === editingRuleId) ?? null)
    : null;

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['automation-rules', channelId] });
  }

  const { mutate: createRule, isPending: isCreatingRule } = useMutation({
    mutationFn: (payload: CreateAutomationRuleRequest) => commentAutomationApi.create(channelId!, payload),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('ruleCreated', { ns: 'instagramAutomation' }));
      setCreatingRule(false);
    },
  });

  const { mutate: updateRule, isPending: isSavingRule } = useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: string; payload: CreateAutomationRuleRequest }) =>
      commentAutomationApi.update(channelId!, ruleId, payload),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('ruleUpdated', { ns: 'instagramAutomation' }));
      setEditingRuleId(null);
    },
  });

  const { mutate: toggleSimpleActive } = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) =>
      commentAutomationApi.setActive(channelId!, ruleId, isActive),
    onSuccess: invalidateAll,
  });

  const { mutate: toggleFlowActive } = useMutation({
    mutationFn: ({ flowId, isActive }: { flowId: string; isActive: boolean }) => flowsApi.setActive(flowId, isActive),
    onSuccess: invalidateAll,
  });

  function toggleActive(item: AutomationListItem) {
    if (item.type === 'simple') toggleSimpleActive({ ruleId: item.id, isActive: !item.isActive });
    else toggleFlowActive({ flowId: item.id, isActive: !item.isActive });
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t('pageTitle')}</h1>
        {instagramChannels.length > 1 && (
          <CustomSelect
            className="w-56"
            options={instagramChannels.map((c) => ({ value: c.id, label: c.name }))}
            value={channelId}
            onChange={(value) => value && selectChannel(String(value))}
          />
        )}
      </div>

      {instagramChannels.length === 0 ? (
        <EmptyState message={t('noInstagramChannel', { ns: 'instagramAutomation' })} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Panel
              className="hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => setCreatingRule(true)}>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary rounded-lg p-2.5">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{t('byKeyword.title')}</p>
                  <p className="text-muted-foreground text-2xs">{t('byKeyword.hint')}</p>
                </div>
              </div>
            </Panel>
            <Panel
              className="hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => setPickingTemplate(true)}>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary rounded-lg p-2.5">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{t('constructor.title')}</p>
                  <p className="text-muted-foreground text-2xs">{t('constructor.hint')}</p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CustomInput
              className="max-w-xs"
              startIcon={<Search className="h-3.5 w-3.5" />}
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <CustomSelect
              className="w-48"
              placeholder={t('sort.default')}
              isClearable
              options={[
                { value: 'name', label: t('sort.name') },
                { value: 'conversion', label: t('sort.conversion') },
              ]}
              value={sort ?? null}
              onChange={(v) => setSort((v as AutomationSort | null) ?? undefined)}
            />
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState message={t('noItems')} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Panel key={`${item.type}-${item.id}`} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.type === 'flow' ? (
                        <GitBranch className="text-primary h-4 w-4" />
                      ) : (
                        <MessageSquareText className="text-primary h-4 w-4" />
                      )}
                      <span className="font-semibold">{item.name}</span>
                    </div>
                    <Badge variant={item.isActive ? 'default' : 'outline'} className="text-2xs">
                      {item.isActive
                        ? t('active', { ns: 'instagramAutomation' })
                        : t('inactive', { ns: 'instagramAutomation' })}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-2xs">
                    {t('contactCount', { count: item.contactCount })}
                    {item.type === 'flow' &&
                      item.conversionPercent !== null &&
                      ` · ${t('conversion', { percent: item.conversionPercent })}`}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {item.type === 'simple' ? (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditingRuleId(item.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                        {t('actions.edit', { ns: 'common' })}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => navigate(`/automations/flows/${item.id}`)}>
                        <GitBranch className="h-3.5 w-3.5" />
                        {t('openCanvas')}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleActive(item)}>
                      {item.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      {item.isActive
                        ? t('disable', { ns: 'instagramAutomation' })
                        : t('enable', { ns: 'instagramAutomation' })}
                    </Button>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </>
      )}

      {channelId && (
        <RuleFormModal
          key="create"
          open={creatingRule}
          channelId={channelId}
          onClose={() => setCreatingRule(false)}
          isSaving={isCreatingRule}
          onSave={(payload) => createRule(payload)}
        />
      )}

      {channelId && editingRule && (
        <RuleFormModal
          key={editingRule.id}
          open
          channelId={channelId}
          rule={editingRule}
          onClose={() => setEditingRuleId(null)}
          isSaving={isSavingRule}
          onSave={(payload) => updateRule({ ruleId: editingRule.id, payload })}
        />
      )}

      {channelId && pickingTemplate && (
        <TemplatePickerModal
          channelId={channelId}
          open={pickingTemplate}
          onClose={() => setPickingTemplate(false)}
          onCreated={(flow) => {
            setPickingTemplate(false);
            navigate(`/automations/flows/${flow.id}`);
          }}
        />
      )}
    </div>
  );
}
