import { create } from 'zustand';
import type { ConversationStatus } from '~/types/conversation';

// Sentinels for the two assignee-filter states that GET /conversations
// can't express as an assignedUserId=<guid> — "me" resolves to the current
// user's id client-side, "unassigned" has no backend query param at all
// (see ConversationList's client-side filter) since assignedUserId only
// ever narrows to a specific user, never to "nobody".
export const ASSIGNEE_FILTER_ME = 'me';
export const ASSIGNEE_FILTER_UNASSIGNED = 'unassigned';

// Not built on createTableStore: that factory's ActiveFilter[] shape fits
// DataTable's generic key/value filters, but the inbox list only ever
// filters by a few typed fields, so a small bespoke store is clearer than
// forcing a generic shape to fit.
interface InboxFilterState {
  channelId: string | null;
  status: ConversationStatus | null;
  // A user id, one of the ASSIGNEE_FILTER_* sentinels above, or null (no filter).
  assigneeFilter: string | null;
  setChannelId: (channelId: string | null) => void;
  setStatus: (status: ConversationStatus | null) => void;
  setAssigneeFilter: (assigneeFilter: string | null) => void;
  reset: () => void;
}

export const useInboxStore = create<InboxFilterState>((set) => ({
  channelId: null,
  status: null,
  assigneeFilter: null,
  setChannelId: (channelId) => set({ channelId }),
  setStatus: (status) => set({ status }),
  setAssigneeFilter: (assigneeFilter) => set({ assigneeFilter }),
  reset: () => set({ channelId: null, status: null, assigneeFilter: null }),
}));
