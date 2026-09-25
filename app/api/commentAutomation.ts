import type { AxiosInstance } from 'axios';
import { apiClient } from '~/lib/client';
import type {
  AutomationRuleListItem,
  CreateAutomationRuleRequest,
  DryRunAutomationRuleRequest,
  DryRunAutomationRuleResult,
  InstagramMediaListResult,
  UpdateAutomationRuleRequest,
} from '~/types/commentAutomation';

// The comment auto-reply rules — one set of calls for two areas: staff (/api) and мизоҷон
// (/api/public, same paths, scoped to their own channels by the backend).
export function createCommentAutomationApi(client: AxiosInstance) {
  return {
    list: async (channelId: string): Promise<AutomationRuleListItem[]> => {
      const { data } = await client.get<AutomationRuleListItem[]>(`/channels/${channelId}/automation-rules`);
      return data;
    },
    create: async (channelId: string, payload: CreateAutomationRuleRequest): Promise<AutomationRuleListItem> => {
      const { data } = await client.post<AutomationRuleListItem>(`/channels/${channelId}/automation-rules`, payload);
      return data;
    },
    update: async (
      channelId: string,
      ruleId: string,
      payload: UpdateAutomationRuleRequest
    ): Promise<AutomationRuleListItem> => {
      const { data } = await client.put<AutomationRuleListItem>(
        `/channels/${channelId}/automation-rules/${ruleId}`,
        payload
      );
      return data;
    },
    setActive: async (channelId: string, ruleId: string, isActive: boolean): Promise<void> => {
      await client.patch(`/channels/${channelId}/automation-rules/${ruleId}/active`, { isActive });
    },
    remove: async (channelId: string, ruleId: string): Promise<void> => {
      await client.delete(`/channels/${channelId}/automation-rules/${ruleId}`);
    },
    dryRun: async (channelId: string, payload: DryRunAutomationRuleRequest): Promise<DryRunAutomationRuleResult> => {
      const { data } = await client.post<DryRunAutomationRuleResult>(
        `/channels/${channelId}/automation-rules/dry-run`,
        payload
      );
      return data;
    },
    listInstagramMedia: async (channelId: string, after?: string): Promise<InstagramMediaListResult> => {
      const { data } = await client.get<InstagramMediaListResult>(`/channels/${channelId}/instagram-media`, {
        params: after ? { after } : undefined,
      });
      return data;
    },
  };
}

export type CommentAutomationApi = ReturnType<typeof createCommentAutomationApi>;

export const commentAutomationApi = createCommentAutomationApi(apiClient);
