import * as signalR from '@microsoft/signalr';
import { jwtDecode } from 'jwt-decode';
import { refreshAccessToken } from '~/lib/client';
import { useAuthStore } from '~/store/useAuthStore';

interface JwtWithExpiry {
  exp?: number;
}

function shouldRefreshToken(token: string | null): boolean {
  if (!token) return true;
  try {
    const { exp } = jwtDecode<JwtWithExpiry>(token);
    if (!exp) return false;
    return exp * 1000 - Date.now() < 60_000;
  } catch {
    return true;
  }
}

export async function getHubAccessToken(): Promise<string> {
  const token = useAuthStore.getState().accessToken;
  if (token && !shouldRefreshToken(token)) return token;
  return refreshAccessToken();
}

// SignalR's client SDK appends the token to the URL as `access_token=`
// automatically for WebSocket transport when accessTokenFactory is set —
// the transport itself can't carry an Authorization header.
export function createHubConnection(hubPath: string): signalR.HubConnection {
  const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

  return new signalR.HubConnectionBuilder()
    .withUrl(`${baseURL}${hubPath}`, {
      accessTokenFactory: getHubAccessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(import.meta.env.DEV ? signalR.LogLevel.Warning : signalR.LogLevel.Error)
    .build();
}
