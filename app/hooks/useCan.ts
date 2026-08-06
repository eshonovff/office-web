import { useAuthStore } from "~/store/useAuthStore";
import type { PermissionKey } from "~/config/permissions";

/**
 * Backend is the source of truth: `/auth/me` already returns the resolved
 * `permissions[]` list ("roles ∪ grants − denials"). This hook only checks
 * membership — it never re-derives access from roles.
 */
export function useCan() {
  const permissions = useAuthStore((s) => s.permissions);

  function can(key: PermissionKey | PermissionKey[]): boolean {
    if (Array.isArray(key)) {
      return key.some((k) => permissions.includes(k));
    }
    return permissions.includes(key);
  }

  function canAll(keys: PermissionKey[]): boolean {
    return keys.every((k) => permissions.includes(k));
  }

  return { can, canAll, permissions };
}
