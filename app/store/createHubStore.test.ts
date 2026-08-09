import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeFakeConnection() {
  return {
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  };
}

vi.mock('~/lib/signalr', () => ({
  createHubConnection: vi.fn(),
}));

describe('createHubStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('transitions idle -> connecting -> connected on a successful start', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    expect(useHub.getState().status).toBe('idle');
    await useHub.getState().start();

    expect(fake.start).toHaveBeenCalledTimes(1);
    expect(useHub.getState().status).toBe('connected');
    expect(useHub.getState().connection).toBe(fake);
  });

  it('does not open a second connection if start() is called while already connected', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    await useHub.getState().start();
    await useHub.getState().start();

    expect(createHubConnection).toHaveBeenCalledTimes(1);
  });

  it('falls back to disconnected when the initial start() rejects', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    fake.start.mockRejectedValue(new Error('network down'));
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    await useHub.getState().start();

    expect(useHub.getState().status).toBe('disconnected');
    expect(useHub.getState().connection).toBeNull();
  });

  it('stop() tears down the connection and resets to idle', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    await useHub.getState().start();
    await useHub.getState().stop();

    expect(fake.stop).toHaveBeenCalledTimes(1);
    expect(useHub.getState().status).toBe('idle');
    expect(useHub.getState().connection).toBeNull();
  });
});
