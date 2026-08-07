import { apiClient } from '~/lib/client';
import { appendToFormData } from '~/lib/form-data';
import type {
  AssignTaskRequest,
  BoardResponse,
  CreateCommentRequest,
  CreateTaskRequest,
  MoveTaskRequest,
  TaskActivity,
  TaskAttachment,
  TaskComment,
  TaskDetail,
  TaskListItem,
  TasksListParams,
  UpdateTaskRequest,
} from '~/types/task';

const MULTIPART_HEADERS = { 'Content-Type': 'multipart/form-data' };

export const tasksApi = {
  board: async (projectId: string): Promise<BoardResponse> => {
    const { data } = await apiClient.get<BoardResponse>(`/projects/${projectId}/board`);
    return data;
  },
  list: async (params?: TasksListParams): Promise<TaskListItem[]> => {
    const { data } = await apiClient.get<TaskListItem[]>('/tasks', { params });
    return data;
  },
  get: async (id: string): Promise<TaskDetail> => {
    const { data } = await apiClient.get<TaskDetail>(`/tasks/${id}`);
    return data;
  },
  create: async (payload: CreateTaskRequest): Promise<TaskDetail> => {
    const { data } = await apiClient.post<TaskDetail>('/tasks', payload);
    return data;
  },
  update: async (id: string, payload: UpdateTaskRequest): Promise<TaskDetail> => {
    const { data } = await apiClient.patch<TaskDetail>(`/tasks/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
  // No response body — the board's own query stays authoritative, so callers
  // patch their optimistic cache themselves rather than re-reading this call.
  move: async (id: string, payload: MoveTaskRequest): Promise<void> => {
    await apiClient.patch(`/tasks/${id}/move`, payload);
  },
  assign: async (id: string, payload: AssignTaskRequest): Promise<void> => {
    await apiClient.patch(`/tasks/${id}/assign`, payload);
  },

  listActivity: async (taskId: string): Promise<TaskActivity[]> => {
    const { data } = await apiClient.get<TaskActivity[]>(`/tasks/${taskId}/activity`);
    return data;
  },

  listComments: async (taskId: string): Promise<TaskComment[]> => {
    const { data } = await apiClient.get<TaskComment[]>(`/tasks/${taskId}/comments`);
    return data;
  },
  createComment: async (taskId: string, payload: CreateCommentRequest): Promise<TaskComment> => {
    const { data } = await apiClient.post<TaskComment>(`/tasks/${taskId}/comments`, payload);
    return data;
  },

  listAttachments: async (taskId: string): Promise<TaskAttachment[]> => {
    const { data } = await apiClient.get<TaskAttachment[]>(`/tasks/${taskId}/attachments`);
    return data;
  },
  uploadAttachment: async (taskId: string, file: File): Promise<TaskAttachment> => {
    const formData = appendToFormData({ file });
    const { data } = await apiClient.post<TaskAttachment>(`/tasks/${taskId}/attachments`, formData, {
      headers: MULTIPART_HEADERS,
    });
    return data;
  },
  getAttachmentBlob: async (taskId: string, attachmentId: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`/tasks/${taskId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    return data;
  },
  deleteAttachment: async (taskId: string, attachmentId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  },
};
