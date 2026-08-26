import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSignalR } from '~/hooks/useSignalR';
import type { BoardResponse } from '~/types/task';
import { useBoardRealtime } from './useBoardRealtime';

const setQueryData = vi.fn();
const invalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ setQueryData, invalidateQueries }),
}));

vi.mock('~/hooks/useSignalR', () => ({
  useSignalR: vi.fn(),
}));

function makeFakeConnection() {
  return { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined) };
}

const createHubConnection = vi.fn((_hubPath: string) => makeFakeConnection());

vi.mock('~/lib/signalr', () => ({
  createHubConnection: (hubPath: string) => createHubConnection(hubPath),
}));

function makeTask(id: string, columnId: string, position: number) {
  return {
    id,
    projectId: 'p1',
    columnId,
    title: id,
    assigneeId: null,
    assigneeName: null,
    priority: 'Medium' as const,
    dueDate: null,
    position,
    labels: [],
  };
}

describe('useBoardRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens a connection scoped to the project via the query string', async () => {
    vi.useFakeTimers();
    renderHook(() => useBoardRealtime('p1', null));
    await act(() => vi.runAllTimersAsync());

    expect(createHubConnection).toHaveBeenCalledWith('/hubs/board?projectId=p1');
    vi.useRealTimers();
  });

  it('does not connect when there is no project id yet', async () => {
    vi.useFakeTimers();
    renderHook(() => useBoardRealtime(undefined, null));
    await act(() => vi.runAllTimersAsync());

    expect(createHubConnection).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('stops the connection on unmount', async () => {
    vi.useFakeTimers();
    const fake = makeFakeConnection();
    createHubConnection.mockReturnValueOnce(fake);

    const { unmount } = renderHook(() => useBoardRealtime('p1', null));
    await act(() => vi.runAllTimersAsync());
    unmount();

    expect(fake.stop).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  function lastHandlers() {
    return vi.mocked(useSignalR).mock.calls.at(-1)?.[1];
  }

  it('inserts a task created by another user into its column, sorted by position', () => {
    renderHook(() => useBoardRealtime('p1', null));
    const detail = {
      id: 't2',
      projectId: 'p1',
      columnId: 'col1',
      title: 'New task',
      description: null,
      assigneeId: null,
      assigneeName: null,
      priority: 'Medium' as const,
      dueDate: null,
      position: 1500,
      createdBy: 'u1',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      labels: [],
    };

    lastHandlers()?.TaskCreated(detail);

    expect(setQueryData).toHaveBeenCalledWith(['projects', 'p1', 'board'], expect.any(Function));
    const updater = setQueryData.mock.calls[0][1] as (old: BoardResponse | undefined) => BoardResponse | undefined;
    const board: BoardResponse = {
      columns: [{ id: 'col1', name: 'Todo', orderIndex: 0, isDoneColumn: false, tasks: [makeTask('t1', 'col1', 1000)] }],
    };

    expect(updater(board)?.columns[0].tasks.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(updater(undefined)).toBeUndefined();
  });

  it('relocates a moved task to the target column and position', () => {
    renderHook(() => useBoardRealtime('p1', null));
    lastHandlers()?.TaskMoved({ taskId: 't1', columnId: 'col2', position: 500 });

    const updater = setQueryData.mock.calls[0][1] as (old: BoardResponse | undefined) => BoardResponse | undefined;
    const board: BoardResponse = {
      columns: [
        { id: 'col1', name: 'Todo', orderIndex: 0, isDoneColumn: false, tasks: [makeTask('t1', 'col1', 1000)] },
        { id: 'col2', name: 'Doing', orderIndex: 1, isDoneColumn: false, tasks: [makeTask('t2', 'col2', 1000)] },
      ],
    };
    const result = updater(board)!;

    expect(result.columns[0].tasks).toEqual([]);
    expect(result.columns[1].tasks.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('removes a deleted task from wherever it sits', () => {
    renderHook(() => useBoardRealtime('p1', null));
    lastHandlers()?.TaskDeleted({ taskId: 't1' });

    const updater = setQueryData.mock.calls[0][1] as (old: BoardResponse | undefined) => BoardResponse | undefined;
    const board: BoardResponse = {
      columns: [{ id: 'col1', name: 'Todo', orderIndex: 0, isDoneColumn: false, tasks: [makeTask('t1', 'col1', 1000)] }],
    };

    expect(updater(board)?.columns[0].tasks).toEqual([]);
  });

  it('refetches the board on TaskUpdated, since its payload shape varies by endpoint', () => {
    renderHook(() => useBoardRealtime('p1', null));
    lastHandlers()?.TaskUpdated({ taskId: 't1', assigneeId: 'u2' });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['projects', 'p1', 'board'] });
  });

  it('refetches the open task comments/activity on CommentAdded', () => {
    renderHook(() => useBoardRealtime('p1', 'task-open'));
    lastHandlers()?.CommentAdded({ id: 'c1', authorId: 'u1', authorName: 'A', body: 'hi', createdAt: '2026-08-18T00:00:00Z' });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks', 'task-open', 'comments'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks', 'task-open', 'activity'] });
  });

  it('ignores CommentAdded when no task modal is open', () => {
    renderHook(() => useBoardRealtime('p1', null));
    lastHandlers()?.CommentAdded({ id: 'c1', authorId: 'u1', authorName: 'A', body: 'hi', createdAt: '2026-08-18T00:00:00Z' });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
