import type { Label } from '~/types/project';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TaskListItem {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  assigneeId: string | null;
  assigneeName: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  labels: Label[];
}

export interface TaskDetail {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  labels: Label[];
}

export interface BoardColumnWithTasks {
  id: string;
  name: string;
  orderIndex: number;
  isDoneColumn: boolean;
  tasks: TaskListItem[];
}

export interface BoardResponse {
  columns: BoardColumnWithTasks[];
}

export interface CreateTaskRequest {
  projectId: string;
  columnId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
  labelIds?: string[] | null;
}

// No assigneeId — assignment goes through the dedicated /assign endpoint.
export interface UpdateTaskRequest {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
  labelIds?: string[] | null;
}

export interface MoveTaskRequest {
  columnId: string;
  beforeTaskId?: string | null;
  afterTaskId?: string | null;
}

export interface AssignTaskRequest {
  assigneeId: string | null;
}

export interface TasksListParams {
  assigneeId?: string;
  labelId?: string;
  priority?: TaskPriority;
  dueFrom?: string;
  dueTo?: string;
  search?: string;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  body: string;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

export type TaskActivityAction =
  | 'created'
  | 'updated'
  | 'moved'
  | 'assigned'
  | 'commented'
  | 'mention'
  | 'attachment_added';

export interface TaskActivity {
  id: string;
  userId: string;
  userName: string;
  action: TaskActivityAction;
  payloadJson: string | null;
  createdAt: string;
}
