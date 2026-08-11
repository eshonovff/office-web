import { create } from 'zustand';
import type { ConversationStatus } from '~/types/conversation';

// Not built on createTableStore: that factory's ActiveFilter[] shape fits
// DataTable's generic key/value filters, but the inbox list only ever
// filters by two typed fields the backend actually supports (channelId,
// status — GET /conversations takes no search param), so a small bespoke
// store is clearer than forcing a generic shape to fit.
interface InboxFilterState {
  channelId: string | null;
  status: ConversationStatus | null;
  setChannelId: (channelId: string | null) => void;
  setStatus: (status: ConversationStatus | null) => void;
  reset: () => void;
}

export const useInboxStore = create<InboxFilterState>((set) => ({
  channelId: null,
  status: null,
  setChannelId: (channelId) => set({ channelId }),
  setStatus: (status) => set({ status }),
  reset: () => set({ channelId: null, status: null }),
}));
