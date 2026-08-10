import { create } from 'zustand';
import type { HubConnection } from '@microsoft/signalr';
import { createHubConnection } from '~/lib/signalr';

export type HubStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface HubStoreState {
  connection: HubConnection | null;
  status: HubStatus;
  reconnectCount: number;
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
  return create<HubStoreState>((set, get) => ({
    connection: null,
    status: 'idle',
    reconnectCount: 0,

    start: async () => {
      if (get().connection) return;

      const connection = createHubConnection(hubPath);
      connection.onreconnecting(() => set({ status: 'reconnecting' }));
      connection.onreconnected(() => set((state) => ({ status: 'connected', reconnectCount: state.reconnectCount + 1 })));
      connection.onclose(() => set({ status: 'disconnected', connection: null }));

      set({ connection, status: 'connecting' });
      try {
        await connection.start();
        set({ status: 'connected' });
      } catch {
        set({ connection: null, status: 'disconnected' });
      }
    },

    stop: async () => {
      const { connection } = get();
      set({ connection: null, status: 'idle' });
      if (connection) await connection.stop();
    },
  }));
}
