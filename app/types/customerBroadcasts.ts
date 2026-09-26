// Mirrors office-api/Office.Api/Features/CustomerBroadcasts/Contracts.cs.

export type BroadcastStatus = 'Scheduled' | 'Sending' | 'Finished' | 'Cancelled' | 'Failed';

export interface BroadcastListItem {
  id: string;
  channelId: string;
  name: string;
  status: BroadcastStatus;
  kind: 'message' | 'flow';
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** Everyone planned when sending began (the reachable part of the audience). */
  recipients: number;
  sent: number;
  failed: number;
  /** Window closed by their turn, a broadcast already that day, or stopped before their turn. */
  skipped: number;
  /** Of the audience, those who could not be reached when sending began. */
  notReachable: number;
  error: string | null;
}

export interface BroadcastFailure {
  contactId: string;
  name: string | null;
  username: string | null;
  error: string | null;
}

export interface BroadcastDetail {
  summary: BroadcastListItem;
  tags: string[];
  text: string | null;
  mediaPreviewDataUri: string | null;
  buttonTitle: string | null;
  buttonUrl: string | null;
  flowId: string | null;
  flowName: string | null;
  failures: BroadcastFailure[];
}

export interface BroadcastAudience {
  /** Contacts of the account (with one of the tags, if any). */
  audience: number;
  /** Of them, who a broadcast would reach right now. */
  reachable: number;
}

/** A message (text and/or an image, an optional link button) or an automation — never both. */
export interface CreateBroadcastRequest {
  channelId: string;
  name: string;
  tags: string[];
  text?: string | null;
  mediaId?: string | null;
  mediaPreviewDataUri?: string | null;
  buttonTitle?: string | null;
  buttonUrl?: string | null;
  flowId?: string | null;
  /** Null — now. */
  scheduledAt?: string | null;
}
