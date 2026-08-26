import { apiClient } from '~/lib/client';
import type {
  BoardColumn,
  CreateColumnRequest,
  CreateLabelRequest,
  CreateProjectRequest,
  Label,
  ProjectDetail,
  ProjectListItem,
  ReorderColumnsRequest,
  SetProjectMembersRequest,
  UpdateColumnRequest,
  UpdateLabelRequest,
  UpdateProjectRequest,
} from '~/types/project';

export const projectsApi = {
  list: async (): Promise<ProjectListItem[]> => {
    const { data } = await apiClient.get<ProjectListItem[]>('/projects');
    return data;
  },
  get: async (id: string): Promise<ProjectDetail> => {
    const { data } = await apiClient.get<ProjectDetail>(`/projects/${id}`);
    return data;
  },
  create: async (payload: CreateProjectRequest): Promise<ProjectListItem> => {
    const { data } = await apiClient.post<ProjectListItem>('/projects', payload);
    return data;
  },
  update: async (id: string, payload: UpdateProjectRequest): Promise<ProjectListItem> => {
    const { data } = await apiClient.patch<ProjectListItem>(`/projects/${id}`, payload);
    return data;
  },
  archive: async (id: string): Promise<void> => {
    await apiClient.post(`/projects/${id}/archive`);
  },
  setMembers: async (id: string, payload: SetProjectMembersRequest): Promise<void> => {
    await apiClient.put(`/projects/${id}/members`, payload);
  },

  createColumn: async (projectId: string, payload: CreateColumnRequest): Promise<BoardColumn> => {
    const { data } = await apiClient.post<BoardColumn>(`/projects/${projectId}/columns`, payload);
    return data;
  },
  updateColumn: async (projectId: string, columnId: string, payload: UpdateColumnRequest): Promise<BoardColumn> => {
    const { data } = await apiClient.patch<BoardColumn>(`/projects/${projectId}/columns/${columnId}`, payload);
    return data;
  },
  deleteColumn: async (projectId: string, columnId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/columns/${columnId}`);
  },
  reorderColumns: async (projectId: string, payload: ReorderColumnsRequest): Promise<void> => {
    await apiClient.put(`/projects/${projectId}/columns/order`, payload);
  },

  listLabels: async (projectId: string): Promise<Label[]> => {
    const { data } = await apiClient.get<Label[]>(`/projects/${projectId}/labels`);
    return data;
  },
  createLabel: async (projectId: string, payload: CreateLabelRequest): Promise<Label> => {
    const { data } = await apiClient.post<Label>(`/projects/${projectId}/labels`, payload);
    return data;
  },
  updateLabel: async (projectId: string, labelId: string, payload: UpdateLabelRequest): Promise<Label> => {
    const { data } = await apiClient.patch<Label>(`/projects/${projectId}/labels/${labelId}`, payload);
    return data;
  },
  deleteLabel: async (projectId: string, labelId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/labels/${labelId}`);
  },
};
