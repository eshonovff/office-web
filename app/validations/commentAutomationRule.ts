import type { TFunction } from 'i18next';
import { z } from 'zod';

export const MATCH_MODES = ['keyword', 'all'] as const;
export const POST_SCOPES = ['all', 'selected'] as const;

export const commentAutomationRuleSchema = (t: TFunction) =>
  z
    .object({
      name: z.string().min(1, t('required', { ns: 'validation' })).max(200, t('stringMax', { ns: 'validation', count: 200 })),
      matchMode: z.enum(MATCH_MODES),
      keywords: z.array(z.string()),
      postScope: z.enum(POST_SCOPES),
      postIds: z.array(z.string()),
      commentReplies: z.array(z.string()),
      dmText: z.string().min(1, t('required', { ns: 'validation' })),
      dmButtonUrl: z.string().optional(),
      // Instagram (Messenger Platform button template) сарлавҳаро то 20 ҳарф иҷозат медиҳад.
      dmButtonTitle: z.string().max(20, t('stringMax', { ns: 'validation', count: 20 })).optional(),
      // Kept as the raw string CustomInput hands back (no z.coerce — that makes the RHF-facing
      // input type diverge from the parsed output type, which react-hook-form's Resolver can't
      // express). Parsed to a number in RuleFormModal.submit before it's sent to the API.
      cooldownMinutes: z.string().regex(/^\d+$/, t('required', { ns: 'validation' })),
      // Фазаи 11 — тасдиқи обуна. Вақте фаъол аст, шохаи дуюм (бе тугма — тибқи спека) ҳатмист.
      requiresFollow: z.boolean(),
      notFollowingCommentReplies: z.array(z.string()),
      notFollowingDmText: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.matchMode === 'keyword' && data.keywords.filter((k) => k.trim()).length === 0) {
        ctx.addIssue({ code: 'custom', path: ['keywords'], message: t('required', { ns: 'validation' }) });
      }
      if (data.postScope === 'selected' && data.postIds.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['postIds'], message: t('required', { ns: 'validation' }) });
      }
      if (data.commentReplies.filter((r) => r.trim()).length === 0) {
        ctx.addIssue({ code: 'custom', path: ['commentReplies'], message: t('required', { ns: 'validation' }) });
      }
      if (data.dmButtonUrl?.trim() && !data.dmButtonTitle?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['dmButtonTitle'], message: t('required', { ns: 'validation' }) });
      }
      if (data.requiresFollow) {
        if (data.notFollowingCommentReplies.filter((r) => r.trim()).length === 0) {
          ctx.addIssue({ code: 'custom', path: ['notFollowingCommentReplies'], message: t('required', { ns: 'validation' }) });
        }
        if (!data.notFollowingDmText?.trim()) {
          ctx.addIssue({ code: 'custom', path: ['notFollowingDmText'], message: t('required', { ns: 'validation' }) });
        }
      }
    });

export type CommentAutomationRuleForm = z.infer<ReturnType<typeof commentAutomationRuleSchema>>;
