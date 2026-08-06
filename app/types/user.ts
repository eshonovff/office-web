export type Gender = 'Male' | 'Female';

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
}

export interface UserPermissionException {
  permissionKey: string;
  isGranted: boolean;
}

export interface UserDetail {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  age: number | null;
  address: string | null;
  gender: Gender | null;
  hasContractDocument: boolean;
  avatarUrl: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  onlyAssigned: boolean;
  roles: RoleSummary[];
  permissionExceptions: UserPermissionException[];
}

export type UserListItem = Omit<UserDetail, 'onlyAssigned' | 'permissionExceptions'>;

export interface CreateUserRequest {
  fullName: string;
  phone: string;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  gender?: Gender | null;
  avatar?: File | null;
}

export interface CreateUserResponse {
  id: string;
  username: string;
  temporaryPassword: string;
  smsSent: boolean;
  avatarUrl: string | null;
}

export interface UpdateUserRequest {
  fullName: string;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  gender?: Gender | null;
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
  smsSent: boolean;
}

export interface UsersListParams {
  search?: string;
  roleId?: string;
  isActive?: boolean;
}
