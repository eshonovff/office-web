import { describe, expect, it } from "vitest";
import { canAccessRoute, Permissions } from "~/config/permissions";

describe("canAccessRoute", () => {
  it("denies a route with no ROUTE_PERMISSIONS entry", () => {
    expect(canAccessRoute("/unknown-page", [Permissions.Users.View])).toBe(false);
  });

  it("denies when the permission is missing", () => {
    expect(canAccessRoute("/users", [])).toBe(false);
  });

  it("allows when the permission is present", () => {
    expect(canAccessRoute("/users", [Permissions.Users.View])).toBe(true);
  });

  it("matches the longest pattern for nested routes", () => {
    expect(canAccessRoute("/users/create", [Permissions.Users.View])).toBe(false);
    expect(canAccessRoute("/users/create", [Permissions.Users.Manage])).toBe(true);
  });

  it("matches dynamic segments", () => {
    expect(canAccessRoute("/users/123", [Permissions.Users.View])).toBe(true);
  });

  it("opens the subscription moderation page only with subscriptions.manage", () => {
    expect(canAccessRoute("/subscriptions", [])).toBe(false);
    expect(canAccessRoute("/subscriptions", [Permissions.Channels.Manage, Permissions.Users.Manage])).toBe(false);
    expect(canAccessRoute("/subscriptions", [Permissions.Subscriptions.Manage])).toBe(true);
  });
});
