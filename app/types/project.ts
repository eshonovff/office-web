export interface ProjectMember {
  userId: string;
  fullName: string;
  username: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  orderIndex: number;
  isDoneColumn: boolean;
}

export interface ProjectListItem {
  id: string;
  name: string;
  key: string;
  color: string | null;
  isArchived: boolean;
}

export interface ProjectDetail extends ProjectListItem {
  createdAt: string;
  members: ProjectMember[];
  columns: BoardColumn[];
}

export interface CreateProjectRequest {
  name: string;
  key: string;
  color?: string | null;
}

export interface UpdateProjectRequest {
  name: string;
  color?: string | null;
}

export interface SetProjectMembersRequest {
  userIds: string[];
}

export interface CreateColumnRequest {
  name: string;
  isDoneColumn: boolean;
}

export interface UpdateColumnRequest {
  name: string;
  isDoneColumn: boolean;
}

export interface ReorderColumnsRequest {
  columnIds: string[];
}

export interface Label {
  id: string;
  name: string;
  color: string | null;
}

export interface CreateLabelRequest {
  name: string;
  color?: string | null;
}

export interface UpdateLabelRequest {
  name: string;
  color?: string | null;
}
