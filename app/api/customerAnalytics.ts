import { customerApiClient } from '~/lib/customerClient';
import type {
  AnalyticsAutomations,
  AnalyticsFlowDetail,
  AnalyticsOverview,
  AnalyticsQuery,
  AnalyticsRange,
} from '~/types/customerAnalytics';

// No channelId — every account of the мизоҷ. The server answers only with the caller's own rows,
// and "not found" for an account or automation that isn't theirs.
const params = ({ from, to, channelId }: AnalyticsQuery) => (channelId ? { from, to, channelId } : { from, to });

export const customerAnalyticsApi = {
  overview: async (query: AnalyticsQuery): Promise<AnalyticsOverview> => {
    const { data } = await customerApiClient.get<AnalyticsOverview>('/analytics/overview', { params: params(query) });
    return data;
  },
  automations: async (query: AnalyticsQuery): Promise<AnalyticsAutomations> => {
    const { data } = await customerApiClient.get<AnalyticsAutomations>('/analytics/automations', {
      params: params(query),
    });
    return data;
  },
  flow: async (flowId: string, { from, to }: AnalyticsRange): Promise<AnalyticsFlowDetail> => {
    const { data } = await customerApiClient.get<AnalyticsFlowDetail>(`/analytics/automations/${flowId}`, {
      params: { from, to },
    });
    return data;
  },
};

export const customerAnalyticsKeys = {
  all: ['customer-analytics'] as const,
  overview: ({ from, to, channelId }: AnalyticsQuery) =>
    ['customer-analytics', 'overview', from, to, channelId ?? null] as const,
  automations: ({ from, to, channelId }: AnalyticsQuery) =>
    ['customer-analytics', 'automations', from, to, channelId ?? null] as const,
  flow: (flowId: string, { from, to }: AnalyticsRange) => ['customer-analytics', 'flow', flowId, from, to] as const,
};
