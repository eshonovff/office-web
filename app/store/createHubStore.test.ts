import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeFakeConnection() {
  let reconnectedHandler: (() => void) | undefined;
  let resolveStart: (() => void) | undefined;
  let rejectStart: ((error: unknown) => void) | undefined;
  const startPromise = new Promise<void>((resolve, reject) => {
    resolveStart = resolve;
    rejectStart = reject;
  });
  return {
    onreconnecting: vi.fn(),
    onreconnected: vi.fn((handler: () => void) => {
      reconnectedHandler = handler;
    }),
    onclose: vi.fn(),
    start: vi.fn(() => startPromise),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    emitReconnected: () => reconnectedHandler?.(),
    resolveStart: () => resolveStart?.(),
    rejectStart: (error: unknown) => rejectStart?.(error),
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
    const startPromise = useHub.getState().start();
    fake.resolveStart();
    await startPromise;

    expect(fake.start).toHaveBeenCalledTimes(1);
    expect(useHub.getState().status).toBe('connected');
    expect(useHub.getState().connection).toBe(fake);
    expect(useHub.getState().error).toBeNull();
  });

  it('does not open a second connection if start() is called while already connected', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    const firstStart = useHub.getState().start();
    const secondStart = useHub.getState().start();
    fake.resolveStart();
    await Promise.all([firstStart, secondStart]);

    expect(createHubConnection).toHaveBeenCalledTimes(1);
  });

  it('falls back to disconnected when the initial start() rejects', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    const startPromise = useHub.getState().start();
    fake.rejectStart(new Error('network down'));
    await startPromise;

    expect(useHub.getState().status).toBe('disconnected');
    expect(useHub.getState().connection).toBeNull();
    expect(useHub.getState().error).toBe('connectionFailed');
  });

  it('stop() tears down the connection and resets to idle', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    const startPromise = useHub.getState().start();
    fake.resolveStart();
    await startPromise;
    await useHub.getState().stop();

    expect(fake.stop).toHaveBeenCalledTimes(1);
    expect(useHub.getState().status).toBe('idle');
    expect(useHub.getState().connection).toBeNull();
    expect(useHub.getState().error).toBeNull();
  });

  it('increments reconnectCount after SignalR reconnects', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    const startPromise = useHub.getState().start();
    fake.resolveStart();
    await startPromise;
    expect(useHub.getState().reconnectCount).toBe(0);

    fake.emitReconnected();

    expect(useHub.getState().status).toBe('connected');
    expect(useHub.getState().reconnectCount).toBe(1);
  });

  it('ignores a start rejection caused by an immediate stop during negotiation', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const fake = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValue(fake as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    const startPromise = useHub.getState().start();
    await useHub.getState().stop();
    fake.rejectStart(new Error('stopped during negotiation'));
    await startPromise;

    expect(useHub.getState().status).toBe('idle');
    expect(useHub.getState().error).toBeNull();
  });

  it('creates a fresh connection after a StrictMode stop/start during negotiation', async () => {
    const { createHubConnection } = await import('~/lib/signalr');
    const staleConnection = makeFakeConnection();
    const currentConnection = makeFakeConnection();
    vi.mocked(createHubConnection).mockReturnValueOnce(staleConnection as any).mockReturnValueOnce(currentConnection as any);

    const { createHubStore } = await import('~/store/createHubStore');
    const useHub = createHubStore('/hubs/test');

    const staleStart = useHub.getState().start();
    await useHub.getState().stop();
    const currentStart = useHub.getState().start();

    staleConnection.rejectStart(new Error('stopped during negotiation'));
    currentConnection.resolveStart();
    await Promise.all([staleStart, currentStart]);

    expect(createHubConnection).toHaveBeenCalledTimes(2);
    expect(useHub.getState().status).toBe('connected');
    expect(useHub.getState().connection).toBe(currentConnection);
    expect(useHub.getState().error).toBeNull();
  });
});
