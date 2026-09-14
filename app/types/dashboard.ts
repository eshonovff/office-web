export interface ClosingWindowItem {
  conversationId: string;
  contactLabel: string;
  windowExpiresAt: string;
}

export interface ClosingWindowsSummary {
  count: number;
  items: ClosingWindowItem[];
}

// No label field — the backend only sends the raw code (or null for a failed message that never
// got a structured one); the frontend translates it via ./dashboard/failureCode.ts, since this
// app is bilingual (tg/ru) and a backend-baked label can't be. This shape is shared with
// types/dashboardStats.ts's identical FailedMessageGroup (failureBreakdown chart) — same data.
export interface FailedMessageGroup {
  failureCode: string | null;
  count: number;
}

export interface FailedMessagesSummary {
  count: number;
  groups: FailedMessageGroup[];
}

export interface ChannelIssueItem {
  channelId: string;
  channelName: string;
  reason: string;
}

export interface ChannelIssuesSummary {
  count: number;
  items: ChannelIssueItem[];
}

export interface ActionRequiredDto {
  closingWindows: ClosingWindowsSummary;
  unassigned: number;
  failedMessages: FailedMessagesSummary;
  channelIssues: ChannelIssuesSummary;
  overdueTasks: TaskGroupSummary;
}

export interface ConversationStatusGroup {
  status: string;
  count: number;
}

export interface TaskPreviewItem {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
}

export interface TaskGroupSummary {
  count: number;
  items: TaskPreviewItem[];
}

export interface MyWorkDto {
  myConversations: ConversationStatusGroup[];
  myUnread: number;
  myTasksToday: TaskGroupSummary;
  myTasksOverdue: TaskGroupSummary;
}

export interface DashboardResponse {
  actionRequired: ActionRequiredDto;
  myWork: MyWorkDto;
  // Mirrors ChannelAccessGuard.CanSeeAllChannels (Owner/Admin) — the authoritative source for
  // whether the Stats tab/route should be reachable. The frontend used to recompute this itself
  // via isOwnerOrAdmin(roles); now it only reads this flag (see dashboard/route.tsx).
  canSeeStats: boolean;
}
