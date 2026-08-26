import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAxiosInstance {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  interceptors: {
    request: { use: ReturnType<typeof vi.fn> };
    response: { use: ReturnType<typeof vi.fn> };
  };
}

function makeAxiosInstance(): FakeAxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({ data: new Blob() }),
    post: vi.fn(),
    patch: vi.fn(),
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

describe('conversationsApi media paths', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    instances.length = 0;
  });

  it('uses originClient for backend absolute /api media paths to avoid /api/api', async () => {
    const { conversationsApi } = await import('~/api/conversations');
    const [, originClient] = instances;

    await conversationsApi.getMediaBlob('/api/messages/m1/media');

    expect(originClient.get).toHaveBeenCalledWith('/api/messages/m1/media', { responseType: 'blob' });
    expect(instances[0].get).not.toHaveBeenCalled();
  });

  it('fetches assignable users scoped to the conversation', async () => {
    const { conversationsApi } = await import('~/api/conversations');
    const [apiClient] = instances;
    apiClient.get.mockResolvedValue({ data: [{ userId: 'u1', fullName: 'Далер', username: 'daler' }] });

    const result = await conversationsApi.listAssignableUsers('c1');

    expect(apiClient.get).toHaveBeenCalledWith('/conversations/c1/assignable-users');
    expect(result).toEqual([{ userId: 'u1', fullName: 'Далер', username: 'daler' }]);
  });
});
