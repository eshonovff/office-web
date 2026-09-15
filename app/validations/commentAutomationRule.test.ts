import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { commentAutomationRuleSchema } from './commentAutomationRule';

const t = ((key: string) => key) as TFunction;

function baseForm() {
  return {
    name: 'Price question',
    matchMode: 'keyword' as const,
    keywords: ['нарх'],
    postScope: 'all' as const,
    postIds: [],
    commentReplies: ['Ташаккур! DM-ро тафтиш кунед.'],
    sendDm: true,
    dmText: 'Салом дар DM',
    dmButtonUrl: '',
    dmButtonTitle: '',
    cooldownMinutes: '60',
    requiresFollow: false,
    notFollowingCommentReplies: [''],
    notFollowingSendDm: true,
    notFollowingDmText: '',
  };
}

describe('commentAutomationRuleSchema', () => {
  it('accepts a fully filled keyword-mode form', () => {
    const result = commentAutomationRuleSchema(t).safeParse(baseForm());

    expect(result.success).toBe(true);
  });

  it('rejects keyword mode with no keywords', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), keywords: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === 'keywords')).toBe(true);
  });

  it('does not require keywords when matchMode is "all"', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), matchMode: 'all', keywords: [] });

    expect(result.success).toBe(true);
  });

  it('rejects postScope "selected" with no posts chosen', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), postScope: 'selected', postIds: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === 'postIds')).toBe(true);
  });

  it('accepts postScope "selected" once a post is chosen', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), postScope: 'selected', postIds: ['media-1'] });

    expect(result.success).toBe(true);
  });

  it('rejects an empty comment-reply list', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), commentReplies: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === 'commentReplies')).toBe(true);
  });

  it('rejects an all-whitespace comment-reply list', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), commentReplies: ['   '] });

    expect(result.success).toBe(false);
  });

  it('rejects a missing dmText when sendDm is on', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), dmText: '' });

    expect(result.success).toBe(false);
  });

  it('does not require dmText when sendDm is off', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), sendDm: false, dmText: '' });

    expect(result.success).toBe(true);
  });

  it('does not require notFollowingDmText when notFollowingSendDm is off', () => {
    const result = commentAutomationRuleSchema(t).safeParse({
      ...baseForm(),
      requiresFollow: true,
      notFollowingCommentReplies: ['Обуна шавед'],
      notFollowingSendDm: false,
      notFollowingDmText: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a non-numeric cooldownMinutes', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), cooldownMinutes: 'abc' });

    expect(result.success).toBe(false);
  });

  it('accepts cooldownMinutes of "0"', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), cooldownMinutes: '0' });

    expect(result.success).toBe(true);
  });

  it('rejects a dmButtonUrl with no dmButtonTitle', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), dmButtonUrl: 'https://example.com', dmButtonTitle: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === 'dmButtonTitle')).toBe(true);
  });

  it('accepts a dmButtonUrl with a dmButtonTitle', () => {
    const result = commentAutomationRuleSchema(t).safeParse({
      ...baseForm(),
      dmButtonUrl: 'https://example.com',
      dmButtonTitle: 'Кушодан',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a dmButtonTitle longer than 20 characters', () => {
    const result = commentAutomationRuleSchema(t).safeParse({
      ...baseForm(),
      dmButtonUrl: 'https://example.com',
      dmButtonTitle: 'ин матни хеле дарозе, ки аз 20 ҳарф зиёд аст',
    });

    expect(result.success).toBe(false);
  });

  it('does not require dmButtonTitle when no dmButtonUrl is set', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), dmButtonUrl: '', dmButtonTitle: '' });

    expect(result.success).toBe(true);
  });

  it('does not require the not-following branch when requiresFollow is off', () => {
    const result = commentAutomationRuleSchema(t).safeParse({
      ...baseForm(),
      requiresFollow: false,
      notFollowingCommentReplies: [],
      notFollowingDmText: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty not-following comment-reply list when requiresFollow is on', () => {
    const result = commentAutomationRuleSchema(t).safeParse({
      ...baseForm(),
      requiresFollow: true,
      notFollowingCommentReplies: [],
      notFollowingDmText: 'Обуна шавед',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === 'notFollowingCommentReplies')).toBe(true);
  });

  it('rejects a missing not-following DM text when requiresFollow is on', () => {
    const result = commentAutomationRuleSchema(t).safeParse({
      ...baseForm(),
      requiresFollow: true,
      notFollowingCommentReplies: ['Обуна шавед'],
      notFollowingDmText: '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === 'notFollowingDmText')).toBe(true);
  });

  it('accepts requiresFollow with both branches filled in', () => {
    const result = commentAutomationRuleSchema(t).safeParse({
      ...baseForm(),
      requiresFollow: true,
      notFollowingCommentReplies: ['Обуна шавед ва боз нависед'],
      notFollowingDmText: 'Лутфан обуна шавед',
    });

    expect(result.success).toBe(true);
  });
});
