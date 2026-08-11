import { useEffect, useRef } from 'react';
import type { HubConnection } from '@microsoft/signalr';

type EventHandlers = Record<string, (...args: unknown[]) => void>;

/**
 * Subscribes `handlers` (event name -> callback) on `connection` for the
 * component's lifetime. Handlers are read through a ref on every call, so
 * the caller can pass a fresh object literal each render without it forcing
 * a resubscribe (and without needing every handler wrapped in useCallback) —
 * only the connection identity re-triggers subscribe/unsubscribe. The set
 * of event *names* is captured once, at mount.
 */
export function useSignalR(connection: HubConnection | null, handlers: EventHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!connection) return;

    const wrapped: EventHandlers = {};
    for (const event of Object.keys(handlersRef.current)) {
      wrapped[event] = (...args: unknown[]) => handlersRef.current[event]?.(...args);
      connection.on(event, wrapped[event]);
    }

    return () => {
      for (const event of Object.keys(wrapped)) {
        connection.off(event, wrapped[event]);
      }
    };
  }, [connection]);
}
