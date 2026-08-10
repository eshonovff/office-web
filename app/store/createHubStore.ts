import { create } from 'zustand';
import type { HubConnection } from '@microsoft/signalr';
import { createHubConnection } from '~/lib/signalr';

export type HubStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface HubStoreState {
  connection: HubConnection | null;
  status: HubStatus;
  reconnectCount: number;
  error: string | null;
  setError: (error: string | null) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * One connection per hub path, shared across every component that mounts
 * while it's active — `start`/`stop` are idempotent, so multiple callers
 * (e.g. two panes both wanting inbox realtime) can call `start()` freely
 * without opening duplicate sockets.
 */
export function createHubStore(hubPath: string) {
  let starting: Promise<void> | null = null;
  let connectionGeneration = 0;

  return create<HubStoreState>((set, get) => ({
    connection: null,
    status: 'idle',
    reconnectCount: 0,
    error: null,
    setError: (error) => set({ error }),

    start: async () => {
      if (get().connection) return starting ?? Promise.resolve();

      const generation = ++connectionGeneration;
      const connection = createHubConnection(hubPath);
      connection.onreconnecting(() => set({ status: 'reconnecting' }));
      connection.onreconnected(() => set((state) => ({ status: 'connected', reconnectCount: state.reconnectCount + 1, error: null })));
      connection.onclose(() => set({ status: 'disconnected', connection: null }));

      set({ connection, status: 'connecting', error: null });
      let startPromise = Promise.resolve();
      startPromise = (async () => {
        try {
          await connection.start();
          if (connectionGeneration !== generation || get().connection !== connection) {
            await connection.stop().catch(() => undefined);
            return;
          }
          set({ status: 'connected' });
        } catch {
          if (connectionGeneration !== generation || get().connection !== connection) return;
          set({ connection: null, status: 'disconnected', error: 'connectionFailed' });
        } finally {
          if (starting === startPromise) starting = null;
        }
      })();

      starting = startPromise;
      await startPromise;
    },

    stop: async () => {
      connectionGeneration += 1;
      const { connection } = get();
      set({ connection: null, status: 'idle', error: null });
      if (connection) await connection.stop();
    },
  }));
}
