export type AutomationMatchMode = 'keyword' | 'all';
export type AutomationPostScope = 'all' | 'selected';

export interface AutomationTriggerConfig {
  matchMode: AutomationMatchMode;
  keywords: string[];
  postScope: AutomationPostScope;
  postIds: string[];
}

export interface AutomationActionConfig {
  commentReplies: string[];
  dmText: string;
  dmButtonUrl: string | null;
}

export interface AutomationRuleListItem {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: AutomationTriggerConfig;
  actionConfig: AutomationActionConfig;
  cooldownMinutes: number;
  createdAt: string;
  runCount: number;
}

export interface CreateAutomationRuleRequest {
  name: string;
  triggerConfig: AutomationTriggerConfig;
  actionConfig: AutomationActionConfig;
  cooldownMinutes: number;
}

export type UpdateAutomationRuleRequest = CreateAutomationRuleRequest;

export interface DryRunAutomationRuleRequest {
  triggerConfig: AutomationTriggerConfig;
  commentText: string;
  mediaId?: string | null;
}

export interface DryRunAutomationRuleResult {
  matched: boolean;
  matchedKeyword: string | null;
}

export interface InstagramMediaListItem {
  id: string;
  mediaType: string | null;
  imageUrl: string | null;
  permalink: string | null;
  caption: string | null;
  timestamp: string | null;
}

export interface InstagramMediaListResult {
  items: InstagramMediaListItem[];
  nextCursor: string | null;
}
