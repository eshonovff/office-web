import { apiClient } from '~/lib/client';
import type { CreateRoleRequest, RoleListItem, SetRolePermissionsRequest, UpdateRoleRequest } from '~/types/role';

export const rolesApi = {
  list: async (): Promise<RoleListItem[]> => {
    const { data } = await apiClient.get<RoleListItem[]>('/roles');
    return data;
  },
  create: async (payload: CreateRoleRequest): Promise<RoleListItem> => {
    const { data } = await apiClient.post<RoleListItem>('/roles', payload);
    return data;
  },
  update: async (id: string, payload: UpdateRoleRequest): Promise<RoleListItem> => {
    const { data } = await apiClient.patch<RoleListItem>(`/roles/${id}`, payload);
    return data;
  },
  setPermissions: async (id: string, payload: SetRolePermissionsRequest): Promise<void> => {
    await apiClient.put(`/roles/${id}/permissions`, payload);
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },
  listPermissionKeys: async (): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>('/permissions');
    return data;
  },
};
