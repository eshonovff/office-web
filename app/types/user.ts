export interface RoleSummary {
  id: string;
  key: string;
  name: string;
}

export interface UserPermissionException {
  permissionKey: string;
  isGranted: boolean;
}

export interface UserListItem {
  id: string;
  fullName: string;
  username: string;
  isActive: boolean;
  roles: RoleSummary[];
}

export interface UserDetail {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  onlyAssigned: boolean;
  roles: RoleSummary[];
  permissionExceptions: UserPermissionException[];
}

export interface CreateUserRequest {
  fullName: string;
  username: string;
  phone?: string | null;
}

export interface CreateUserResponse {
  id: string;
  username: string;
  temporaryPassword: string;
}

export interface UpdateUserRequest {
  fullName: string;
  phone?: string | null;
  onlyAssigned: boolean;
}

export interface SetUserRolesRequest {
  roleIds: string[];
}

export interface SetUserPermissionsRequest {
  exceptions: UserPermissionException[];
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
}

export interface UsersListParams {
  search?: string;
  roleId?: string;
  isActive?: boolean;
}
