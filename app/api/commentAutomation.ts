import { apiClient } from '~/lib/client';
import type {
  AutomationRuleListItem,
  CreateAutomationRuleRequest,
  DryRunAutomationRuleRequest,
  DryRunAutomationRuleResult,
  InstagramMediaListResult,
  UpdateAutomationRuleRequest,
} from '~/types/commentAutomation';

export const commentAutomationApi = {
  list: async (channelId: string): Promise<AutomationRuleListItem[]> => {
    const { data } = await apiClient.get<AutomationRuleListItem[]>(`/channels/${channelId}/automation-rules`);
    return data;
  },
  create: async (channelId: string, payload: CreateAutomationRuleRequest): Promise<AutomationRuleListItem> => {
    const { data } = await apiClient.post<AutomationRuleListItem>(`/channels/${channelId}/automation-rules`, payload);
    return data;
  },
  update: async (channelId: string, ruleId: string, payload: UpdateAutomationRuleRequest): Promise<AutomationRuleListItem> => {
    const { data } = await apiClient.put<AutomationRuleListItem>(`/channels/${channelId}/automation-rules/${ruleId}`, payload);
    return data;
  },
  setActive: async (channelId: string, ruleId: string, isActive: boolean): Promise<void> => {
    await apiClient.patch(`/channels/${channelId}/automation-rules/${ruleId}/active`, { isActive });
  },
  remove: async (channelId: string, ruleId: string): Promise<void> => {
    await apiClient.delete(`/channels/${channelId}/automation-rules/${ruleId}`);
  },
  dryRun: async (channelId: string, payload: DryRunAutomationRuleRequest): Promise<DryRunAutomationRuleResult> => {
    const { data } = await apiClient.post<DryRunAutomationRuleResult>(`/channels/${channelId}/automation-rules/dry-run`, payload);
    return data;
  },
  listInstagramMedia: async (channelId: string, after?: string): Promise<InstagramMediaListResult> => {
    const { data } = await apiClient.get<InstagramMediaListResult>(`/channels/${channelId}/instagram-media`, {
      params: after ? { after } : undefined,
    });
    return data;
  },
};
