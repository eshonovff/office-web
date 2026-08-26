import { matchPath } from "react-router";

// Mirrors office-api/Office.Api/Auth/Permissions.cs — keep the two in sync.
export const Permissions = {
  Users: { View: "users.view", Manage: "users.manage" },
  Roles: { View: "roles.view", Manage: "roles.manage" },
  Projects: { View: "projects.view", Manage: "projects.manage" },
  Tasks: {
    View: "tasks.view",
    Create: "tasks.create",
    Edit: "tasks.edit",
    Delete: "tasks.delete",
    Assign: "tasks.assign",
    Move: "tasks.move",
  },
  Inbox: {
    View: "inbox.view",
    Reply: "inbox.reply",
    Assign: "inbox.assign",
    Close: "inbox.close",
    Delete: "inbox.delete",
  },
  Channels: { Manage: "channels.manage" },
  Templates: { Manage: "templates.manage" },
} as const;

type ValueOf<T> = T[keyof T];
export type PermissionKey = ValueOf<{ [K in keyof typeof Permissions]: ValueOf<(typeof Permissions)[K]> }>;

// Mirrors office-api/Office.Api/Auth/RoleKeys.cs — /auth/me's `roles[]` carries these exact keys.
export const RoleKeys = { Owner: "owner", Admin: "admin" } as const;

/**
 * Mirrors ChannelAccessGuard.CanSeeAllChannels: Owner/Admin bypass conversation
 * assignment (e.g. can send on a chat assigned to someone else) regardless of
 * their resolved permission grants, since that check is role-based on the
 * backend, not permission-based.
 */
export function isOwnerOrAdmin(roles: string[]): boolean {
  return roles.includes(RoleKeys.Owner) || roles.includes(RoleKeys.Admin);
}

export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  "/users": Permissions.Users.View,
  "/users/create": Permissions.Users.Manage,
  "/users/:id": Permissions.Users.View,
  "/roles": Permissions.Roles.View,
  "/projects": Permissions.Projects.View,
  "/projects/:id": Permissions.Tasks.View,
  "/inbox": Permissions.Inbox.View,
  "/inbox/board": Permissions.Inbox.View,
  "/channels": Permissions.Channels.Manage,
  "/settings": Permissions.Templates.Manage,
};

/**
 * Unknown route → denied. This is the inverse of Nizom's `canAccess`, which
 * defaulted to `true` and let any authenticated Student reach `/centers/create`.
 * Every real route must have an explicit entry in ROUTE_PERMISSIONS.
 */
export function canAccessRoute(pathname: string, permissions: string[]): boolean {
  const entries = Object.entries(ROUTE_PERMISSIONS);
  const matches = entries.filter(([pattern]) => matchPath({ path: pattern, end: true }, pathname));

  if (matches.length === 0) return false;

  matches.sort((a, b) => b[0].length - a[0].length);
  const [, requiredPermission] = matches[0];
  return permissions.includes(requiredPermission);
}
