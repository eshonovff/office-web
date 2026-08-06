import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useCan } from "~/hooks/useCan";
import { useAuthStore } from "~/store/useAuthStore";

function setPermissions(permissions: string[]) {
  useAuthStore.setState({ permissions });
}

describe("useCan", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });
  });

  it("checks a single permission key", () => {
    setPermissions(["tasks.view"]);
    const { result } = renderHook(() => useCan());
    expect(result.current.can("tasks.view")).toBe(true);
    expect(result.current.can("tasks.edit")).toBe(false);
  });

  it("OR-matches an array of keys", () => {
    setPermissions(["inbox.reply"]);
    const { result } = renderHook(() => useCan());
    expect(result.current.can(["inbox.reply", "inbox.close"])).toBe(true);
    expect(result.current.can(["inbox.close", "inbox.delete"])).toBe(false);
  });

  it("AND-matches with canAll", () => {
    setPermissions(["tasks.edit", "tasks.move"]);
    const { result } = renderHook(() => useCan());
    expect(result.current.canAll(["tasks.edit", "tasks.move"])).toBe(true);
    expect(result.current.canAll(["tasks.edit", "tasks.delete"])).toBe(false);
  });
});
