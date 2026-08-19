import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAxiosInstance {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  interceptors: {
    request: { use: ReturnType<typeof vi.fn> };
    response: { use: ReturnType<typeof vi.fn> };
  };
}

function makeAxiosInstance(): FakeAxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    put: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
}

const instances: FakeAxiosInstance[] = [];

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance = makeAxiosInstance();
      instances.push(instance);
      return instance;
    }),
  },
}));

describe('channelsApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    instances.length = 0;
  });

  it('loads the caller-accessible inbox channels from /channels/mine', async () => {
    const { channelsApi } = await import('~/api/channels');

    await channelsApi.mine();

    expect(instances[0].get).toHaveBeenCalledWith('/channels/mine');
  });

  it('fetches assignable users for a channel', async () => {
    const { channelsApi } = await import('~/api/channels');

    await channelsApi.listAssignableUsers('ch1');

    expect(instances[0].get).toHaveBeenCalledWith('/channels/ch1/assignable-users');
  });

  it('requests the OAuth authorization URL with a lowercase provider segment', async () => {
    const { channelsApi } = await import('~/api/channels');

    await channelsApi.startOAuth('Instagram');

    expect(instances[0].get).toHaveBeenCalledWith('/channels/oauth/instagram/start');
  });

  it('posts the picked account to the lowercase-provider connect endpoint', async () => {
    const { channelsApi } = await import('~/api/channels');
    instances[0].post.mockResolvedValue({ data: {} });

    await channelsApi.connectOAuth('Facebook', { connectionId: 'c1', externalId: 'page1', name: 'My Page' });

    expect(instances[0].post).toHaveBeenCalledWith('/channels/oauth/facebook/connect', {
      connectionId: 'c1',
      externalId: 'page1',
      name: 'My Page',
    });
  });
});
