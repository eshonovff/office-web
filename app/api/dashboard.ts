import { apiClient } from '~/lib/client';
import type { DashboardResponse } from '~/types/dashboard';
import type { DashboardStatsResponse } from '~/types/dashboardStats';

export const dashboardApi = {
  get: async (): Promise<DashboardResponse> => {
    const { data } = await apiClient.get<DashboardResponse>('/dashboard');
    return data;
  },
  // days must be one of STATS_DAYS_OPTIONS (7/14/30/90) — the backend 400s on anything else,
  // no clamping. The caller (stats/route.tsx) normalizes ?days= before this is ever called.
  getStats: async (days: number): Promise<DashboardStatsResponse> => {
    const { data } = await apiClient.get<DashboardStatsResponse>('/dashboard/stats', { params: { days } });
    return data;
  },
};
