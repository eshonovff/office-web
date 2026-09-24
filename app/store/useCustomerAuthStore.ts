import { create } from "zustand";
import type { CustomerMeResponse } from "~/types/customerAuth";

interface CustomerAuthState {
  accessToken: string | null;
  customer: CustomerMeResponse | null;
  setSession: (accessToken: string, customer: CustomerMeResponse) => void;
  setAccessToken: (accessToken: string) => void;
  setCustomer: (customer: CustomerMeResponse) => void;
  clear: () => void;
}

// Deliberately separate from useAuthStore (staff) — a customer session must never be
// readable from, or confused with, the staff session in the same browser tab.
// No `persist`, same reasoning as useAuthStore: short-lived access token stays in memory,
// the httpOnly customer_refresh_token cookie carries the session across a hard refresh.
export const useCustomerAuthStore = create<CustomerAuthState>((set) => ({
  accessToken: null,
  customer: null,
  setSession: (accessToken, customer) => set({ accessToken, customer }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setCustomer: (customer) => set({ customer }),
  clear: () => set({ accessToken: null, customer: null }),
}));
