import { apiClient } from "~/lib/client";
import type { LoginResponse, MeResponse } from "~/types/auth";
import type { ChangePasswordForm, LoginForm } from "~/validations/auth";

export const authApi = {
  login: async (payload: LoginForm): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
    return data;
  },
  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },
  changePassword: async (payload: ChangePasswordForm): Promise<void> => {
    await apiClient.post("/auth/change-password", {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
  },
  me: async (): Promise<MeResponse> => {
    const { data } = await apiClient.get<MeResponse>("/auth/me");
    return data;
  },
};
