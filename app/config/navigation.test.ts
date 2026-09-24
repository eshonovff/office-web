import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { getSidebarConfig, getVisibleNavigation } from "~/config/navigation";
import { Permissions, type PermissionKey } from "~/config/permissions";

const t = ((key: string) => key) as unknown as TFunction;
const canWith = (granted: PermissionKey[]) => (required: PermissionKey | PermissionKey[]) =>
  (Array.isArray(required) ? required : [required]).every((p) => granted.includes(p));

describe("sidebar navigation", () => {
  it("links the dashboard to /dashboard — '/' is the public landing page", () => {
    const dashboard = getSidebarConfig(t).find((item) => item.title === "navigation.dashboard");
    expect(dashboard?.url).toBe("/dashboard");
  });

  it("shows Subscriptions, with its pending badge, only to moderators", () => {
    const find = (granted: PermissionKey[]) =>
      getVisibleNavigation(getSidebarConfig(t), canWith(granted)).find((item) => item.url === "/subscriptions");

    expect(find([Permissions.Users.View])).toBeUndefined();
    expect(find([Permissions.Subscriptions.Manage])?.badgeKey).toBe("pendingSubscriptions");
  });
});
