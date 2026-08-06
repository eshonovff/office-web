import { apiClient } from '~/lib/client';
import type {
  CreateUserRequest,
  CreateUserResponse,
  ResetPasswordResponse,
  SetUserPermissionsRequest,
  SetUserRolesRequest,
  UpdateUserRequest,
  UserDetail,
  UserListItem,
  UsersListParams,
} from '~/types/user';

export const usersApi = {
  list: async (params: UsersListParams): Promise<UserListItem[]> => {
    const { data } = await apiClient.get<UserListItem[]>('/users', { params });
    return data;
  },
  get: async (id: string): Promise<UserDetail> => {
    const { data } = await apiClient.get<UserDetail>(`/users/${id}`);
    return data;
  },
  create: async (payload: CreateUserRequest): Promise<CreateUserResponse> => {
    const { data } = await apiClient.post<CreateUserResponse>('/users', payload);
    return data;
  },
  update: async (id: string, payload: UpdateUserRequest): Promise<void> => {
    await apiClient.patch(`/users/${id}`, payload);
  },
  setRoles: async (id: string, payload: SetUserRolesRequest): Promise<void> => {
    await apiClient.put(`/users/${id}/roles`, payload);
  },
  setPermissions: async (id: string, payload: SetUserPermissionsRequest): Promise<void> => {
    await apiClient.put(`/users/${id}/permissions`, payload);
  },
  resetPassword: async (id: string): Promise<ResetPasswordResponse> => {
    const { data } = await apiClient.post<ResetPasswordResponse>(`/users/${id}/reset-password`);
    return data;
  },
  setActive: async (id: string, isActive: boolean): Promise<void> => {
    await apiClient.patch(`/users/${id}/active`, { isActive });
  },
};
