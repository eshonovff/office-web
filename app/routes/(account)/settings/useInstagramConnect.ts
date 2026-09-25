import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerChannelsApi } from '~/api/customerFlows';
import { waitForOAuthPopupResult, type PopupLike } from '~/routes/(app)/channels/oauthPopup';
import type { OAuthAccountOption, OAuthCallbackResponse } from '~/types/channel';

export const CUSTOMER_CHANNELS_QUERY_KEY = ['customer', 'channels'] as const;

type Phase = 'idle' | 'waiting' | 'accounts' | 'connecting';

function isCallbackSuccess(value: unknown): value is OAuthCallbackResponse {
  return typeof value === 'object' && value !== null && 'connectionId' in value && 'accounts' in value;
}

/**
 * The мизоҷ side of "connect Instagram" — the staff flow's shape (useOAuthConnectFlow), on the
 * мизоҷ's API. The popup result is read by oauthPopup.ts, which only accepts a message from the
 * exact window opened here.
 */
export function useInstagramConnect() {
  const { t } = useTranslation(['customerAuth', 'inbox', 'common']);
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('idle');
  const [accounts, setAccounts] = useState<OAuthAccountOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const popupRef = useRef<PopupLike | null>(null);

  function reset() {
    popupRef.current = null;
    connectionIdRef.current = null;
    setAccounts([]);
    setSelected(null);
    setPhase('idle');
  }

  async function begin() {
    // Opened synchronously in the click handler, or the browser blocks it as a popup.
    const popup = window.open('about:blank', 'instagram-connect', 'width=560,height=720') as PopupLike | null;
    if (!popup) {
      toast.error(t('oauthPopupBlocked', { ns: 'inbox' }));
      return;
    }
    popupRef.current = popup;
    setPhase('waiting');

    try {
      const { url } = await customerChannelsApi.startInstagramOAuth();
      popup.location.href = url;
    } catch {
      // The interceptor already showed why (no plan, network…).
      popup.close();
      reset();
      return;
    }

    let result: unknown;
    try {
      result = await waitForOAuthPopupResult(popup);
    } catch {
      reset(); // the мизоҷ closed the window — deliberate, nothing to report
      return;
    }

    if (!isCallbackSuccess(result)) {
      const problem = result as { title?: string; detail?: string } | null;
      toast.error(problem?.detail || problem?.title || t('errors.unknown', { ns: 'common' }));
      reset();
      return;
    }

    connectionIdRef.current = result.connectionId;
    setAccounts(result.accounts);
    setSelected(result.accounts.length === 1 ? result.accounts[0].externalId : null);
    setPhase('accounts');
  }

  async function confirm() {
    const account = accounts.find((a) => a.externalId === selected);
    if (!connectionIdRef.current || !account) return;

    setPhase('connecting');
    try {
      await customerChannelsApi.connectInstagram({
        connectionId: connectionIdRef.current,
        externalId: account.externalId,
        name: account.name,
      });
    } catch {
      // Toasted by the interceptor: plan limit, account owned elsewhere, expired session.
      setPhase('accounts');
      return;
    }

    await queryClient.invalidateQueries({ queryKey: CUSTOMER_CHANNELS_QUERY_KEY });
    toast.success(t('settings.accounts.connected'));
    reset();
  }

  function cancel() {
    popupRef.current?.close();
    reset();
  }

  return { phase, accounts, selected, select: setSelected, begin, confirm, cancel };
}
