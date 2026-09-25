import { useState } from 'react';
import type { ModeratorSubscriptionRequest } from '~/types/subscriptionRequests';

/**
 * The request a dialog shows, kept through its closing animation: the page clears its state
 * the moment the dialog closes, and the content would otherwise vanish mid-fade.
 */
export function useLastRequest(request: ModeratorSubscriptionRequest | null): ModeratorSubscriptionRequest | null {
  const [last, setLast] = useState(request);
  if (request && request !== last) setLast(request);
  return request ?? last;
}
