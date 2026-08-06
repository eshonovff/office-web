import { create } from "zustand";
import type { MeResponse } from "~/types/auth";

interface AuthState {
  accessToken: string | null;
  user: MeResponse | null;
  roles: string[];
  permissions: string[];
  setSession: (accessToken: string, user: MeResponse) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: MeResponse) => void;
  clear: () => void;
}

// No `persist` — the access token is short-lived (15 min) and only ever
// meant to live in memory. Sessions survive a hard refresh via the httpOnly
// refresh cookie, not localStorage.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  roles: [],
  permissions: [],
  setSession: (accessToken, user) =>
    set({ accessToken, user, roles: user.roles, permissions: user.permissions }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user, roles: user.roles, permissions: user.permissions }),
  clear: () => set({ accessToken: null, user: null, roles: [], permissions: [] }),
}));
