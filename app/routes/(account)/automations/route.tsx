import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { customerChannelsApi, customerFlowBuilderApi, customerFlowsApi } from '~/api/customerFlows';
import { customerSubscriptionsApi } from '~/api/customerSubscriptions';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import { canAddOneMore, resolvePlanLimits } from '~/lib/customerPlan';
import { FlowBuilderApiProvider } from '~/lib/flowBuilderApi';
import { TemplatePickerModal } from '~/routes/(app)/automations/components/TemplatePickerModal';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { FlowListItem } from '~/types/flow';
import { SUBSCRIPTION_CATALOG_QUERY_KEY } from '../billing/queryKeys';
import { CUSTOMER_CHANNELS_QUERY_KEY } from '../settings/useInstagramConnect';

const flowsKey = (channelId: string) => ['channels', channelId, 'flows'] as const;

export default function CustomerAutomationsPage() {
  const { t } = useTranslation(['customerAuth', 'automations', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const access = useCustomerAuthStore((s) => s.customer?.access);

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: CUSTOMER_CHANNELS_QUERY_KEY,
    queryFn: customerChannelsApi.list,
  });
  const { data: catalog } = useQuery({
    queryKey: SUBSCRIPTION_CATALOG_QUERY_KEY,
    queryFn: customerSubscriptionsApi.catalog,
  });

  const activeChannels = channels?.filter((c) => c.isActive) ?? [];
  const [pickedChannelId, setPickedChannelId] = useState<string | null>(null);
  const channelId = pickedChannelId ?? activeChannels[0]?.id ?? null;

  const { data: flows, isLoading: flowsLoading } = useQuery({
    queryKey: flowsKey(channelId ?? ''),
    queryFn: () => customerFlowsApi.list(channelId!),
    enabled: channelId !== null,
  });

  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<FlowListItem | null>(null);

  const invalidateFlows = () => queryClient.invalidateQueries({ queryKey: ['channels'] });

  const { mutate: setActive } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => customerFlowsApi.setActive(id, isActive),
    onSettled: invalidateFlows, // also on a refused activation (plan limit) — snap the switch back
  });

  const { mutate: remove, isPending: isRemoving } = useMutation({
    mutationFn: (id: string) => customerFlowsApi.remove(id),
    onSuccess: async () => {
      await invalidateFlows();
      setToDelete(null);
      toast.success(t('deleted', { ns: 'automations' }));
    },
  });

  const limits = resolvePlanLimits(access, catalog);
  const hasAccess = access?.hasAccess === true;
  const activeFlows = flows?.filter((f) => f.isActive).length ?? 0;
  // Counted per channel here; the backend counts across all the мизоҷ's channels and has the
  // final say — this only disables the button early in the common one-channel case.
  const atLimit = limits !== null && !canAddOneMore(limits.activeAutomations, activeFlows);

  if (channelsLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <FlowBuilderApiProvider value={customerFlowBuilderApi}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('automations.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('automations.subtitle')}</p>
          </div>
          {channelId && (
            <Button onClick={() => setCreating(true)} disabled={!hasAccess || atLimit}>
              <Plus />
              {t('automations.create')}
            </Button>
          )}
        </div>

        {!hasAccess && <PlanNotice text={t('automations.noAccess')} linkText={t('billing.status.choosePlan')} />}
        {hasAccess && atLimit && (
          <PlanNotice
            text={t('automations.atLimit', { count: limits?.activeAutomations ?? 0 })}
            linkText={t('automations.upgrade')}
          />
        )}

        {activeChannels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-medium">{t('automations.noChannelTitle')}</p>
              <p className="text-muted-foreground max-w-md text-sm">{t('automations.noChannelText')}</p>
              <Button render={<Link to="/account/settings" />}>{t('automations.goConnect')}</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {activeChannels.length > 1 ? (
                <div className="w-64">
                  <CustomSelect
                    value={channelId ?? ''}
                    onChange={(value) => setPickedChannelId(value === null ? null : String(value))}
                    options={activeChannels.map((c) => ({ value: c.id, label: c.name }))}
                  />
                </div>
              ) : (
                <p className="text-sm font-medium">{activeChannels[0].name}</p>
              )}
              {limits && (
                <p className="text-muted-foreground text-sm">
                  {t('automations.usage', {
                    used: activeFlows,
                    limit: limits.activeAutomations ?? t('automations.unlimited'),
                  })}
                </p>
              )}
            </div>

            {flowsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !flows?.length ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
                {t('automations.empty')}
              </p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {flows.map((flow) => (
                  <li key={flow.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{flow.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {t(`templatePicker.triggerType.${flow.triggerType}`, {
                          ns: 'automations',
                          defaultValue: flow.triggerType,
                        })}
                      </p>
                    </div>
                    <Badge variant={flow.isActive ? 'default' : 'outline'}>
                      {flow.isActive ? t('automations.on') : t('automations.off')}
                    </Badge>
                    <Switch
                      checked={flow.isActive}
                      onCheckedChange={(isActive) => setActive({ id: flow.id, isActive })}
                      disabled={!hasAccess && !flow.isActive}
                      aria-label={t('automations.toggle')}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(customerFlowBuilderApi.paths.editor(flow.id))}>
                      <Pencil />
                      {t('automations.open')}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setToDelete(flow)}
                      aria-label={t('actions.delete', { ns: 'common' })}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {channelId && (
          <TemplatePickerModal
            channelId={channelId}
            open={creating}
            onClose={() => setCreating(false)}
            onCreated={async (flow) => {
              setCreating(false);
              await invalidateFlows(); // before navigating, so "back" shows the new flow
              navigate(customerFlowBuilderApi.paths.editor(flow.id));
            }}
          />
        )}

        <ConfirmDialog
          open={toDelete !== null}
          onOpenChange={(open) => !open && setToDelete(null)}
          onConfirm={() => toDelete && remove(toDelete.id)}
          type="danger"
          title={t('deleteConfirmTitle', { ns: 'automations' })}
          description={t('deleteConfirmDescription', { ns: 'automations' })}
          isLoading={isRemoving}
        />
      </div>
    </FlowBuilderApiProvider>
  );
}

function PlanNotice({ text, linkText }: { text: string; linkText: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-amber-600" />
      <span className="flex-1">{text}</span>
      <Button size="sm" render={<Link to="/account/billing" />}>
        {linkText}
      </Button>
    </div>
  );
}
