import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAxiosInstance {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  interceptors: { request: { use: ReturnType<typeof vi.fn> }; response: { use: ReturnType<typeof vi.fn> } };
}

function makeAxiosInstance(): FakeAxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
}

const instances: FakeAxiosInstance[] = [];

vi.mock('axios', () => ({
  default: { create: vi.fn(() => { const instance = makeAxiosInstance(); instances.push(instance); return instance; }) },
}));

describe('notificationsApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    instances.length = 0;
  });

  it('lists notifications from /notifications', async () => {
    const { notificationsApi } = await import('~/api/notifications');
    await notificationsApi.list();
    expect(instances[0].get).toHaveBeenCalledWith('/notifications');
  });

  it('marks specific notifications as read', async () => {
    const { notificationsApi } = await import('~/api/notifications');
    await notificationsApi.markRead({ notificationIds: ['n1', 'n2'] });
    expect(instances[0].post).toHaveBeenCalledWith('/notifications/read', { notificationIds: ['n1', 'n2'] });
  });

  it('marks every notification as read when called without a payload', async () => {
    const { notificationsApi } = await import('~/api/notifications');
    await notificationsApi.markRead();
    expect(instances[0].post).toHaveBeenCalledWith('/notifications/read', undefined);
  });
});
