import { createContext, useContext } from 'react';
import { commentAutomationApi } from '~/api/commentAutomation';
import { flowTemplatesApi, type FlowTemplatesApi } from '~/api/flowTemplates';
import { flowsApi, type FlowsApi } from '~/api/flows';
import type {
  DryRunAutomationRuleRequest,
  DryRunAutomationRuleResult,
  InstagramMediaListResult,
} from '~/types/commentAutomation';

/**
 * Everything the Flow Builder talks to, so the same editor serves two areas: staff (/api,
 * /automations) and мизоҷон (/api/public, /account/automations). Components read it through
 * useFlowBuilderApi() instead of importing flowsApi directly.
 */
export interface FlowBuilderApi {
  flows: FlowsApi;
  templates: FlowTemplatesApi;
  listInstagramMedia: (channelId: string, after?: string) => Promise<InstagramMediaListResult>;
  /** The comment rule form's "test it" panel (DryRunPanel). */
  dryRunRule: (channelId: string, payload: DryRunAutomationRuleRequest) => Promise<DryRunAutomationRuleResult>;
  /** Where the automations list and a flow's editor live in this area. */
  paths: { list: string; editor: (flowId: string) => string };
}

export const staffFlowBuilderApi: FlowBuilderApi = {
  flows: flowsApi,
  templates: flowTemplatesApi,
  listInstagramMedia: commentAutomationApi.listInstagramMedia,
  dryRunRule: (channelId, payload) => commentAutomationApi.dryRun(channelId, payload),
  paths: { list: '/automations', editor: (flowId) => `/automations/flows/${flowId}` },
};

// Default = staff, so every existing staff screen keeps working without a provider; the мизоҷ
// routes wrap the editor in a provider with the customer API.
const FlowBuilderApiContext = createContext<FlowBuilderApi>(staffFlowBuilderApi);

export const FlowBuilderApiProvider = FlowBuilderApiContext.Provider;

export function useFlowBuilderApi(): FlowBuilderApi {
  return useContext(FlowBuilderApiContext);
}
