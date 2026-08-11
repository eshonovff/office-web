import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeAxiosInstance {
  (config: unknown): Promise<{ data: string; config: unknown }>;
  interceptors: {
    request: { use: (fn: (config: any) => any) => void };
    response: {
      use: (onFulfilled: (r: unknown) => unknown, onRejected: (e: unknown) => unknown) => void;
    };
  };
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  _reqHandler?: (config: any) => any;
  _resRejected?: (error: unknown) => unknown;
}

function createFakeAxiosInstance(): FakeAxiosInstance {
  const fn = vi.fn(async (config: unknown) => ({ data: "retried", config })) as unknown as FakeAxiosInstance;
  fn.interceptors = {
    request: {
      use: (onFulfilled) => {
        fn._reqHandler = onFulfilled;
      },
    },
    response: {
      use: (_onFulfilled, onRejected) => {
        fn._resRejected = onRejected;
      },
    },
  };
  fn.post = vi.fn();
  fn.get = vi.fn();
  return fn;
}

const instances: FakeAxiosInstance[] = [];

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => {
      const instance = createFakeAxiosInstance();
      instances.push(instance);
      return instance;
    }),
  },
}));

function makeUnauthorizedError(url: string) {
  return {
    response: { status: 401 },
    config: { url, headers: {} },
  };
}

describe("apiClient refresh queue", () => {
  beforeEach(() => {
    vi.resetModules();
    instances.length = 0;
  });

  it("collapses 5 concurrent 401s into a single /auth/refresh call", async () => {
    const { apiClient } = await import("~/lib/client");
    const { useAuthStore } = await import("~/store/useAuthStore");
    void apiClient;

    const [apiClientMock, , refreshClientMock] = instances;
    refreshClientMock.post.mockResolvedValue({ data: { accessToken: "new-token" } });

    const errors = Array.from({ length: 5 }, () => makeUnauthorizedError("/tasks"));
    const results = await Promise.all(errors.map((e) => apiClientMock._resRejected!(e)));

    expect(refreshClientMock.post).toHaveBeenCalledTimes(1);
    expect(refreshClientMock.post).toHaveBeenCalledWith("/auth/refresh");
    expect(apiClientMock).toHaveBeenCalledTimes(5);
    results.forEach((r: any) => expect(r.config.headers.Authorization).toBe("Bearer new-token"));
    expect(useAuthStore.getState().accessToken).toBe("new-token");
  });

  it("logs out and rejects queued requests when refresh itself fails", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "" },
      writable: true,
      configurable: true,
    });

    const { apiClient } = await import("~/lib/client");
    const { useAuthStore } = await import("~/store/useAuthStore");
    void apiClient;
    useAuthStore.setState({ accessToken: "stale-token", user: null, roles: [], permissions: [] });

    const [apiClientMock, , refreshClientMock] = instances;
    refreshClientMock.post.mockRejectedValue(makeUnauthorizedError("/auth/refresh"));

    const error = makeUnauthorizedError("/tasks");
    await expect(apiClientMock._resRejected!(error)).rejects.toBeTruthy();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(window.location.href).toBe("/login");

    Object.defineProperty(window, "location", { value: originalLocation, writable: true, configurable: true });
  });

  it("does not attempt a refresh for a failed /auth/login", async () => {
    const { apiClient } = await import("~/lib/client");
    void apiClient;
    const [apiClientMock, , refreshClientMock] = instances;

    await expect(apiClientMock._resRejected!(makeUnauthorizedError("/auth/login"))).rejects.toBeTruthy();

    expect(refreshClientMock.post).not.toHaveBeenCalled();
  });
});
