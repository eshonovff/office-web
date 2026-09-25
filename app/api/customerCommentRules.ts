import { createCommentAutomationApi } from '~/api/commentAutomation';
import { customerApiClient } from '~/lib/customerClient';

/** A мизоҷ's comment auto-reply rules (comments page) — the staff calls, under /api/public. */
export const customerCommentRulesApi = createCommentAutomationApi(customerApiClient);

export const customerCommentRuleKeys = {
  all: ['customer-comment-rules'] as const,
  list: (channelId: string) => ['customer-comment-rules', channelId] as const,
};
