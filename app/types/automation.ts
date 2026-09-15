export type AutomationListItemType = 'simple' | 'flow';

export interface AutomationListItem {
  id: string;
  type: AutomationListItemType;
  name: string;
  isActive: boolean;
  channelId: string;
  channelName: string;
  contactCount: number;
  // Only computed for type="flow" (finished/total sessions) — null for "simple".
  conversionPercent: number | null;
  createdAt: string;
}

// Matches AutomationsEndpoints.ListAsync's `sort` switch — anything else (including
// omitted) falls back to newest-first on the backend.
export type AutomationSort = 'name' | 'conversion';
