import { describe, expect, it } from 'vitest';
import { taskMatchesFilters, emptyBoardFilters } from '~/lib/taskFilter';
import type { TaskListItem } from '~/types/task';

function makeTask(overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id: 't1',
    projectId: 'p1',
    columnId: 'col1',
    title: 'Fix the login bug',
    assigneeId: 'u1',
    assigneeName: 'Далер',
    priority: 'High',
    dueDate: null,
    position: 1000,
    labels: [{ id: 'l1', name: 'Bug', color: null }],
    ...overrides,
  };
}

describe('taskMatchesFilters', () => {
  it('matches everything when no filters are active', () => {
    expect(taskMatchesFilters(makeTask(), emptyBoardFilters)).toBe(true);
  });

  it('filters by priority', () => {
    const task = makeTask({ priority: 'Low' });
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, priority: 'Low' })).toBe(true);
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, priority: 'High' })).toBe(false);
  });

  it('filters by assignee', () => {
    const task = makeTask({ assigneeId: 'u1' });
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, assigneeId: 'u1' })).toBe(true);
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, assigneeId: 'u2' })).toBe(false);
  });

  it('filters by label', () => {
    const task = makeTask({ labels: [{ id: 'l1', name: 'Bug', color: null }] });
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, labelId: 'l1' })).toBe(true);
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, labelId: 'l2' })).toBe(false);
  });

  it('filters by search, case-insensitively, against the title', () => {
    const task = makeTask({ title: 'Fix the LOGIN bug' });
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, search: 'login' })).toBe(true);
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, search: 'payment' })).toBe(false);
  });

  it('requires all active filters to match (AND, not OR)', () => {
    const task = makeTask({ priority: 'High', assigneeId: 'u1' });
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, priority: 'High', assigneeId: 'u2' })).toBe(false);
    expect(taskMatchesFilters(task, { ...emptyBoardFilters, priority: 'High', assigneeId: 'u1' })).toBe(true);
  });
});
