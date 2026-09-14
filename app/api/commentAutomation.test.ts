import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAxiosInstance {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  interceptors: {
    request: { use: ReturnType<typeof vi.fn> };
    response: { use: ReturnType<typeof vi.fn> };
  };
}

function makeAxiosInstance(): FakeAxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: undefined }),
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

describe('commentAutomationApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    instances.length = 0;
  });

  it('lists automation rules for a channel', async () => {
    const { commentAutomationApi } = await import('~/api/commentAutomation');

    await commentAutomationApi.list('ch1');

    expect(instances[0].get).toHaveBeenCalledWith('/channels/ch1/automation-rules');
  });

  it('posts a new rule to the channel-scoped endpoint', async () => {
    const { commentAutomationApi } = await import('~/api/commentAutomation');
    const payload = {
      name: 'Price question',
      triggerConfig: { matchMode: 'keyword' as const, keywords: ['нарх'], postScope: 'all' as const, postIds: [] },
      actionConfig: { commentReplies: ['DM-ро тафтиш кунед'], dmText: 'Салом!', dmButtonUrl: null },
      cooldownMinutes: 60,
    };

    await commentAutomationApi.create('ch1', payload);

    expect(instances[0].post).toHaveBeenCalledWith('/channels/ch1/automation-rules', payload);
  });

  it('toggles active state via PATCH', async () => {
    const { commentAutomationApi } = await import('~/api/commentAutomation');

    await commentAutomationApi.setActive('ch1', 'rule1', false);

    expect(instances[0].patch).toHaveBeenCalledWith('/channels/ch1/automation-rules/rule1/active', { isActive: false });
  });

  it('sends dry-run requests without persisting anything server-side', async () => {
    const { commentAutomationApi } = await import('~/api/commentAutomation');
    const payload = {
      triggerConfig: { matchMode: 'keyword' as const, keywords: ['нарх'], postScope: 'all' as const, postIds: [] },
      commentText: 'Нархаш чанд?',
      mediaId: null,
    };

    await commentAutomationApi.dryRun('ch1', payload);

    expect(instances[0].post).toHaveBeenCalledWith('/channels/ch1/automation-rules/dry-run', payload);
  });

  it('requests instagram media with an after cursor when provided', async () => {
    const { commentAutomationApi } = await import('~/api/commentAutomation');

    await commentAutomationApi.listInstagramMedia('ch1', 'cursor-1');

    expect(instances[0].get).toHaveBeenCalledWith('/channels/ch1/instagram-media', { params: { after: 'cursor-1' } });
  });

  it('omits the after param on the first page', async () => {
    const { commentAutomationApi } = await import('~/api/commentAutomation');

    await commentAutomationApi.listInstagramMedia('ch1');

    expect(instances[0].get).toHaveBeenCalledWith('/channels/ch1/instagram-media', { params: undefined });
  });
});
