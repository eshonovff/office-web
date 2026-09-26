// A мизоҷ's analytics (/api/public/analytics) — every number is made only of the мизоҷ's own rows.
// Dates are whole days in Dushanbe time, 'YYYY-MM-DD'.

/** A number in the chosen period and in the same number of days just before it. */
export interface AnalyticsCount {
  current: number;
  previous: number;
}

export interface AnalyticsDay {
  date: string;
  newContacts: number;
  inboundMessages: number;
  automaticReplies: number;
}

export interface AnalyticsBroadcasts {
  broadcasts: number;
  sent: number;
  skipped: number;
  failed: number;
}

export interface AnalyticsTopPost {
  channelId: string;
  mediaId: string;
  comments: number;
  /** Of those comments, how many the comment auto-reply answered in public. */
  autoReplied: number;
}

export interface AnalyticsOverview {
  from: string;
  to: string;
  newContacts: AnalyticsCount;
  inboundMessages: AnalyticsCount;
  automaticReplies: AnalyticsCount;
  manualReplies: AnalyticsCount;
  comments: AnalyticsCount;
  started: AnalyticsCount;
  /** Of the people who started an automation in the period, those who reached its goal (never above 100 %). */
  converted: AnalyticsCount;
  days: AnalyticsDay[];
  broadcasts: AnalyticsBroadcasts;
  topPosts: AnalyticsTopPost[];
}

export interface AnalyticsFlowRow {
  flowId: string;
  channelId: string;
  name: string;
  isActive: boolean;
  /** False — the automation has no «Мақсад» step, so there is no goal to count. */
  hasConversionStep: boolean;
  started: AnalyticsCount;
  converted: AnalyticsCount;
}

export interface AnalyticsRuleRow {
  ruleId: string;
  channelId: string;
  name: string;
  isActive: boolean;
  comments: number;
  publicReplies: number;
  directMessages: number;
  errors: number;
  /** People told "follow, then comment again". */
  askedToFollow: number;
  /** Of them, those found following on a later comment. */
  followedAfterAsking: number;
}

export interface AnalyticsAutomations {
  from: string;
  to: string;
  flows: AnalyticsFlowRow[];
  rules: AnalyticsRuleRow[];
}

export interface AnalyticsFlowDay {
  date: string;
  started: number;
  converted: number;
}

export interface AnalyticsStarter {
  contactId: string;
  name: string | null;
  username: string | null;
  startedAt: string;
  converted: boolean;
}

export interface AnalyticsFlowDetail {
  flowId: string;
  name: string;
  hasConversionStep: boolean;
  from: string;
  to: string;
  started: AnalyticsCount;
  converted: AnalyticsCount;
  days: AnalyticsFlowDay[];
  recentStarters: AnalyticsStarter[];
}

export interface AnalyticsRange {
  from: string;
  to: string;
}

/** A period, and one of the мизоҷ's own accounts — or all of them. */
export interface AnalyticsQuery extends AnalyticsRange {
  channelId?: string;
}
