export interface MeResponse {
  id: string;
  fullName: string;
  username: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
  user: MeResponse;
}

export interface RefreshResponse {
  accessToken: string;
}
