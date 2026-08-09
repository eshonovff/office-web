import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '~/store/useAuthStore';

// SignalR's client SDK appends the token to the URL as `access_token=`
// automatically for WebSocket transport when accessTokenFactory is set —
// the transport itself can't carry an Authorization header.
export function createHubConnection(hubPath: string): signalR.HubConnection {
  const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

  return new signalR.HubConnectionBuilder()
    .withUrl(`${baseURL}${hubPath}`, {
      accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(import.meta.env.DEV ? signalR.LogLevel.Warning : signalR.LogLevel.Error)
    .build();
}
