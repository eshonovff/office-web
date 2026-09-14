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
    dmText: 'Салом дар DM',
    dmButtonUrl: '',
    cooldownMinutes: '60',
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

  it('rejects a missing dmText', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), dmText: '' });

    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric cooldownMinutes', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), cooldownMinutes: 'abc' });

    expect(result.success).toBe(false);
  });

  it('accepts cooldownMinutes of "0"', () => {
    const result = commentAutomationRuleSchema(t).safeParse({ ...baseForm(), cooldownMinutes: '0' });

    expect(result.success).toBe(true);
  });
});
