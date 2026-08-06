export interface RoleListItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface CreateRoleRequest {
  key: string;
  name: string;
  description?: string | null;
}

export interface UpdateRoleRequest {
  name: string;
  description?: string | null;
}

export interface SetRolePermissionsRequest {
  permissionKeys: string[];
}
