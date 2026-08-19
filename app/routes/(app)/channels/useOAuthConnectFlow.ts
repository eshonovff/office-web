import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { channelsApi } from '~/api/channels';
import type { ChannelDetail, ChannelListItem, OAuthAccountOption, OAuthCallbackResponse, OAuthProvider } from '~/types/channel';
import { OAuthPopupClosedError, OAuthPopupParseError, waitForOAuthPopupResult, type PopupLike } from './oauthPopup';

export type OAuthConnectPhase = 'idle' | 'waiting' | 'accounts' | 'connecting';

interface OAuthConnectState {
  phase: OAuthConnectPhase;
  accounts: OAuthAccountOption[];
  connectionId: string | null;
  selectedExternalId: string | null;
}

const IDLE_STATE: OAuthConnectState = { phase: 'idle', accounts: [], connectionId: null, selectedExternalId: null };

function isOAuthCallbackSuccess(value: unknown): value is OAuthCallbackResponse {
  return typeof value === 'object' && value !== null && 'connectionId' in value && 'accounts' in value;
}

interface ProblemDetailsLike {
  title?: string;
  detail?: string;
}

function isProblemDetails(value: unknown): value is ProblemDetailsLike {
  return typeof value === 'object' && value !== null && ('title' in value || 'detail' in value);
}

/**
 * Drives one provider's OAuth-connect popup end to end: opens it, waits for
 * Meta's round-trip (see oauthPopup.ts for why that's a same-origin DOM read
 * rather than a second request), and hands back the account list for the
 * caller to render as a confirmation step. One instance per provider — the
 * page-level "Пайваст кардани Instagram/Facebook" button and any per-channel
 * "Пайваст аз нав" (reconnect) button for that same provider all call the
 * same instance's `begin()`, so they share one modal instead of each needing
 * their own.
 */
export function useOAuthConnectFlow(provider: OAuthProvider, existingChannels: ChannelListItem[]) {
  const { t } = useTranslation(['inbox', 'common']);
  const queryClient = useQueryClient();
  const [state, setState] = useState<OAuthConnectState>(IDLE_STATE);
  const popupRef = useRef<PopupLike | null>(null);

  function reset() {
    popupRef.current = null;
    setState(IDLE_STATE);
  }

  /** Whether picking this account would update an existing channel rather than create one — /connect upserts by (type, externalId), silently, so this is the only place that distinction is visible at all. */
  function isAlreadyConnected(externalId: string): boolean {
    return existingChannels.some((c) => c.type === provider && c.externalId === externalId);
  }

  async function begin() {
    // Must be opened synchronously inside the click handler — anything after
    // an `await` here would lose the user-activation flag most browsers
    // require to allow window.open() without treating it as a popup-blocked
    // spam attempt. It starts on about:blank and only gets pointed at Meta's
    // authorization URL once /start resolves, below.
    const popup = window.open('about:blank', 'meta-oauth-connect', 'width=560,height=720') as PopupLike | null;
    if (!popup) {
      toast.error(t('oauthPopupBlocked', { ns: 'inbox' }));
      return;
    }

    popupRef.current = popup;
    setState({ ...IDLE_STATE, phase: 'waiting' });

    let url: string;
    try {
      ({ url } = await channelsApi.startOAuth(provider));
    } catch {
      // apiClient's interceptor already toasted the specific reason (403 missing
      // channels.manage, network failure, ...) — nothing more to add here.
      popup.close();
      reset();
      return;
    }

    popup.location.href = url;

    let result: unknown;
    try {
      result = await waitForOAuthPopupResult(popup, '/channels/oauth/');
    } catch (error) {
      if (error instanceof OAuthPopupClosedError) {
        // Deliberate user action (closed the window, or backed out of Meta's
        // dialog until it closed itself) — not a failure, nothing to toast.
      } else if (error instanceof OAuthPopupParseError) {
        toast.error(t('oauthResultUnreadable', { ns: 'inbox' }));
      }
      reset();
      return;
    }

    if (isOAuthCallbackSuccess(result)) {
      setState({ phase: 'accounts', accounts: result.accounts, connectionId: result.connectionId, selectedExternalId: null });
      return;
    }

    // The callback's own ProblemDetails already distinguish the real failure
    // reasons — expired/replayed state, the user denying consent, Meta's
    // token exchange failing — with a specific title/detail apiClient would
    // otherwise have surfaced automatically for a normal request. This read
    // didn't go through apiClient (see oauthPopup.ts), so it's surfaced by
    // hand here, the same way apiClient's own interceptor prefers detail.
    const message = (isProblemDetails(result) && (result.detail || result.title)) || t('errors.unknown', { ns: 'common' });
    toast.error(message);
    reset();
  }

  function selectAccount(externalId: string) {
    setState((prev) => ({ ...prev, selectedExternalId: externalId }));
  }

  async function confirm() {
    const { connectionId, selectedExternalId, accounts } = state;
    const account = accounts.find((a) => a.externalId === selectedExternalId);
    if (!connectionId || !account) return;

    const wasAlreadyConnected = isAlreadyConnected(account.externalId);
    setState((prev) => ({ ...prev, phase: 'connecting' }));
    let channel: ChannelDetail;
    try {
      channel = await channelsApi.connectOAuth(provider, { connectionId, externalId: account.externalId, name: account.name });
    } catch {
      // apiClient already toasted (e.g. the connection expired between
      // picking an account and confirming — same "аз OAuth аз нав сар кунед"
      // detail as everywhere else that connectionId is checked).
      setState((prev) => ({ ...prev, phase: 'accounts' }));
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['channels'] });
    toast.success(t(wasAlreadyConnected ? 'channelUpdated' : 'channelCreated', { ns: 'inbox' }));
    reset();
    return channel;
  }

  function cancel() {
    popupRef.current?.close();
    reset();
  }

  return {
    phase: state.phase,
    accounts: state.accounts,
    selectedExternalId: state.selectedExternalId,
    begin,
    selectAccount,
    confirm,
    cancel,
    isAlreadyConnected,
  };
}
