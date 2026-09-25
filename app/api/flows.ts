import type { AxiosInstance, AxiosProgressEvent } from 'axios';
import { apiClient } from '~/lib/client';
import type {
  CreateFlowRequest,
  FlowDetail,
  FlowListItem,
  FlowStats,
  UpdateFlowGraphRequest,
  UpdateFlowRequest,
  UploadFlowMediaResult,
} from '~/types/flow';

/**
 * Built per HTTP client: staff use apiClient (/api), a мизоҷ uses customerApiClient (/api/public)
 * — the paths below are identical under both, and the backend scopes each to its caller.
 */
export function createFlowsApi(client: AxiosInstance) {
  return {
    list: async (channelId: string): Promise<FlowListItem[]> => {
      const { data } = await client.get<FlowListItem[]>(`/channels/${channelId}/flows`);
      return data;
    },
    create: async (channelId: string, payload: CreateFlowRequest): Promise<FlowDetail> => {
      const { data } = await client.post<FlowDetail>(`/channels/${channelId}/flows`, payload);
      return data;
    },
    get: async (id: string): Promise<FlowDetail> => {
      const { data } = await client.get<FlowDetail>(`/flows/${id}`);
      return data;
    },
    update: async (id: string, payload: UpdateFlowRequest): Promise<FlowDetail> => {
      const { data } = await client.put<FlowDetail>(`/flows/${id}`, payload);
      return data;
    },
    updateGraph: async (id: string, payload: UpdateFlowGraphRequest): Promise<FlowDetail> => {
      const { data } = await client.put<FlowDetail>(`/flows/${id}/graph`, payload);
      return data;
    },
    setActive: async (id: string, isActive: boolean): Promise<void> => {
      await client.patch(`/flows/${id}/active`, { isActive });
    },
    remove: async (id: string): Promise<void> => {
      await client.delete(`/flows/${id}`);
    },
    uploadMedia: async (
      channelId: string,
      file: File,
      onUploadProgress?: (event: AxiosProgressEvent) => void
    ): Promise<UploadFlowMediaResult> => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await client.post<UploadFlowMediaResult>(`/channels/${channelId}/flows/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      });
      return data;
    },
    stats: async (id: string): Promise<FlowStats> => {
      const { data } = await client.get<FlowStats>(`/flows/${id}/stats`);
      return data;
    },
  };
}

export type FlowsApi = ReturnType<typeof createFlowsApi>;

export const flowsApi = createFlowsApi(apiClient);
