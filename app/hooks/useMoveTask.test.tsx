import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '~/lib/query-client';
import { tasksApi } from '~/api/tasks';
import { useMoveTask } from '~/hooks/useMoveTask';
import type { BoardResponse } from '~/types/task';

vi.mock('~/api/tasks', () => ({
  tasksApi: { move: vi.fn() },
}));

const projectId = 'p1';
const boardKey = ['projects', projectId, 'board'];

const previousBoard: BoardResponse = {
  columns: [
    {
      id: 'col1',
      name: 'Todo',
      orderIndex: 0,
      isDoneColumn: false,
      tasks: [
        {
          id: 't1',
          projectId,
          columnId: 'col1',
          title: 'Task 1',
          assigneeId: null,
          assigneeName: null,
          priority: 'Medium',
          dueDate: null,
          position: 1000,
          labels: [],
        },
      ],
    },
  ],
};

const optimisticBoard: BoardResponse = {
  columns: [
    { ...previousBoard.columns[0], tasks: [] },
    { id: 'col2', name: 'Doing', orderIndex: 1, isDoneColumn: false, tasks: [{ ...previousBoard.columns[0].tasks[0], columnId: 'col2' }] },
  ],
};

describe('useMoveTask', () => {
  beforeEach(() => {
    vi.mocked(tasksApi.move).mockReset();
  });

  it('rolls back the query cache to the drag-start snapshot when the server rejects the move', async () => {
    vi.mocked(tasksApi.move).mockRejectedValue(new Error('network error'));

    const queryClient = makeQueryClient();
    // Simulate onDragOver having already written the live-reordered board
    // to the cache before the mutation fires (see Board.tsx).
    queryClient.setQueryData(boardKey, optimisticBoard);

    const { result } = renderHook(() => useMoveTask(projectId), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    result.current.mutate({
      taskId: 't1',
      payload: { columnId: 'col2', beforeTaskId: null, afterTaskId: null },
      previousSnapshot: previousBoard,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(boardKey)).toEqual(previousBoard);
  });

  it('leaves the optimistic board in place when the move succeeds', async () => {
    vi.mocked(tasksApi.move).mockResolvedValue(undefined);

    const queryClient = makeQueryClient();
    queryClient.setQueryData(boardKey, optimisticBoard);

    const { result } = renderHook(() => useMoveTask(projectId), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    result.current.mutate({
      taskId: 't1',
      payload: { columnId: 'col2', beforeTaskId: null, afterTaskId: null },
      previousSnapshot: previousBoard,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // No onSettled invalidation — the optimistic board (already applied by
    // onDragOver before the mutation ran) is left untouched.
    expect(queryClient.getQueryData(boardKey)).toEqual(optimisticBoard);
  });
});
