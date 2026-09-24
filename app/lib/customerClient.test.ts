import { beforeEach, describe, expect, it, vi } from 'vitest';

// Same fake-axios harness as client.test.ts: axios.create() returns a callable fake whose
// interceptors are captured so a failed response can be fed straight into them.
interface FakeAxiosInstance {
  (config: unknown): Promise<{ data: string; config: unknown }>;
  interceptors: {
    request: { use: (fn: (config: unknown) => unknown) => void };
    response: { use: (onFulfilled: (r: unknown) => unknown, onRejected: (e: unknown) => unknown) => void };
  };
  post: ReturnType<typeof vi.fn>;
  _resRejected?: (error: unknown) => unknown;
}

const instances: FakeAxiosInstance[] = [];

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const fn = vi.fn(async (config: unknown) => ({ data: 'retried', config })) as unknown as FakeAxiosInstance;
      fn.interceptors = {
        request: { use: () => {} },
        response: {
          use: (_onFulfilled, onRejected) => {
            fn._resRejected = onRejected;
          },
        },
      };
      fn.post = vi.fn();
      instances.push(fn);
      return fn;
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('i18next', () => ({ default: { t: (key: string) => key } }));

const unauthorized = (url: string) => ({ response: { status: 401 }, config: { url, headers: {} } });

describe('customerApiClient refresh failures', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.resetModules();
    instances.length = 0;
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '' },
      writable: true,
      configurable: true,
    });
    return () =>
      Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
  });

  async function setUp() {
    await import('~/lib/customerClient');
    const { useCustomerAuthStore } = await import('~/store/useCustomerAuthStore');
    useCustomerAuthStore.setState({ accessToken: 'stale-token', customer: null });
    // customerClient creates: customerApiClient, externalLoginClient, refreshClient.
    const [apiClientMock, , refreshClientMock] = instances;
    return { apiClientMock, refreshClientMock, useCustomerAuthStore };
  }

  it('logs the мизоҷ out when the server refuses the refresh', async () => {
    const { apiClientMock, refreshClientMock, useCustomerAuthStore } = await setUp();
    refreshClientMock.post.mockRejectedValue(unauthorized('/auth/refresh'));

    await expect(apiClientMock._resRejected!(unauthorized('/subscriptions/requests'))).rejects.toBeTruthy();

    expect(useCustomerAuthStore.getState().accessToken).toBeNull();
    expect(window.location.href).toBe('/account/login');
  });

  it('keeps the session when the server is unreachable during refresh', async () => {
    const { apiClientMock, refreshClientMock, useCustomerAuthStore } = await setUp();
    refreshClientMock.post.mockRejectedValue(new Error('Network Error'));

    await expect(apiClientMock._resRejected!(unauthorized('/subscriptions/requests'))).rejects.toBeTruthy();

    expect(useCustomerAuthStore.getState().accessToken).toBe('stale-token');
    expect(window.location.href).toBe('');
  });
});
