import { apiClient } from '~/lib/client';
import { appendToFormData } from '~/lib/form-data';
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

const MULTIPART_HEADERS = { 'Content-Type': 'multipart/form-data' };

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
    const formData = appendToFormData(payload as unknown as Record<string, unknown>);
    const { data } = await apiClient.post<CreateUserResponse>('/users', formData, {
      headers: MULTIPART_HEADERS,
    });
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
  uploadAvatar: async (id: string, file: File): Promise<UserDetail> => {
    const formData = appendToFormData({ file });
    const { data } = await apiClient.post<UserDetail>(`/users/${id}/avatar`, formData, {
      headers: MULTIPART_HEADERS,
    });
    return data;
  },
  getAvatarBlob: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`/users/${id}/avatar`, { responseType: 'blob' });
    return data;
  },
  uploadContractDocument: async (id: string, file: File): Promise<void> => {
    const formData = appendToFormData({ file });
    await apiClient.post(`/users/${id}/contract-document`, formData, { headers: MULTIPART_HEADERS });
  },
  getContractDocumentBlob: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`/users/${id}/contract-document`, { responseType: 'blob' });
    return data;
  },
};
