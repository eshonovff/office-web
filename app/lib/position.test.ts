import { describe, expect, it } from 'vitest';
import {
  applyTaskMoved,
  assignTaskInBoard,
  getMoveNeighbors,
  moveTaskInBoard,
  removeTaskFromBoard,
  upsertTaskInBoard,
} from '~/lib/position';
import type { BoardResponse, TaskListItem } from '~/types/task';

function makeTask(id: string, columnId: string, position: number): TaskListItem {
  return {
    id,
    projectId: 'p1',
    columnId,
    title: id,
    assigneeId: null,
    assigneeName: null,
    priority: 'Medium',
    dueDate: null,
    position,
    labels: [],
  };
}

describe('getMoveNeighbors', () => {
  it('drops at the start of an empty column', () => {
    expect(getMoveNeighbors([], 0)).toEqual({ beforeTaskId: null, afterTaskId: null });
  });

  it('drops at the start of a non-empty column', () => {
    expect(getMoveNeighbors(['a', 'b', 'c'], 0)).toEqual({ beforeTaskId: 'a', afterTaskId: null });
  });

  it('drops in the middle', () => {
    expect(getMoveNeighbors(['a', 'b', 'c'], 1)).toEqual({ beforeTaskId: 'b', afterTaskId: 'a' });
  });

  it('drops at the end', () => {
    expect(getMoveNeighbors(['a', 'b', 'c'], 3)).toEqual({ beforeTaskId: null, afterTaskId: 'c' });
  });

  it('clamps an out-of-range index', () => {
    expect(getMoveNeighbors(['a', 'b'], 99)).toEqual({ beforeTaskId: null, afterTaskId: 'b' });
    expect(getMoveNeighbors(['a', 'b'], -5)).toEqual({ beforeTaskId: 'a', afterTaskId: null });
  });
});

describe('moveTaskInBoard', () => {
  const board: BoardResponse = {
    columns: [
      { id: 'col1', name: 'Todo', orderIndex: 0, isDoneColumn: false, tasks: [makeTask('t1', 'col1', 1000)] },
      {
        id: 'col2',
        name: 'Doing',
        orderIndex: 1,
        isDoneColumn: false,
        tasks: [makeTask('t2', 'col2', 1000), makeTask('t3', 'col2', 2000)],
      },
    ],
  };

  it('moves a task to a different column, recomputing position as a midpoint', () => {
    const result = moveTaskInBoard(board, 't1', 'col2', 1);

    const col1 = result.columns.find((c) => c.id === 'col1')!;
    const col2 = result.columns.find((c) => c.id === 'col2')!;

    expect(col1.tasks.map((t) => t.id)).toEqual([]);
    expect(col2.tasks.map((t) => t.id)).toEqual(['t2', 't1', 't3']);
    expect(col2.tasks[1].position).toBe(1500);
    expect(col2.tasks[1].columnId).toBe('col2');
  });

  it('reorders within the same column', () => {
    const result = moveTaskInBoard(board, 't3', 'col2', 0);
    const col2 = result.columns.find((c) => c.id === 'col2')!;
    expect(col2.tasks.map((t) => t.id)).toEqual(['t3', 't2']);
  });

  it('drops into an empty column at the end', () => {
    const result = moveTaskInBoard(board, 't1', 'col2', 2);
    const col2 = result.columns.find((c) => c.id === 'col2')!;
    expect(col2.tasks.map((t) => t.id)).toEqual(['t2', 't3', 't1']);
    expect(col2.tasks[2].position).toBe(3000);
  });

  it('is a no-op when the task id is not found', () => {
    const result = moveTaskInBoard(board, 'missing', 'col2', 0);
    expect(result).toBe(board);
  });
});

describe('assignTaskInBoard', () => {
  const board: BoardResponse = {
    columns: [
      { id: 'col1', name: 'Todo', orderIndex: 0, isDoneColumn: false, tasks: [makeTask('t1', 'col1', 1000)] },
    ],
  };

  it('sets the assignee on the matching task, wherever it sits', () => {
    const result = assignTaskInBoard(board, 't1', 'u1', 'Далер');
    expect(result.columns[0].tasks[0]).toMatchObject({ assigneeId: 'u1', assigneeName: 'Далер' });
  });

  it('clears the assignee when passed null', () => {
    const assigned = assignTaskInBoard(board, 't1', 'u1', 'Далер');
    const cleared = assignTaskInBoard(assigned, 't1', null, null);
    expect(cleared.columns[0].tasks[0]).toMatchObject({ assigneeId: null, assigneeName: null });
  });
});

describe('removeTaskFromBoard', () => {
  const board: BoardResponse = {
    columns: [
      { id: 'col1', name: 'Todo', orderIndex: 0, isDoneColumn: false, tasks: [makeTask('t1', 'col1', 1000)] },
    ],
  };

  it('removes the task wherever it sits', () => {
    const result = removeTaskFromBoard(board, 't1');
    expect(result.columns[0].tasks).toEqual([]);
  });

  it('is a no-op when the task id is not found', () => {
    const result = removeTaskFromBoard(board, 'missing');
    expect(result.columns[0].tasks).toHaveLength(1);
  });
});

describe('applyTaskMoved', () => {
  const board: BoardResponse = {
    columns: [
      { id: 'col1', name: 'Todo', orderIndex: 0, isDoneColumn: false, tasks: [makeTask('t1', 'col1', 1000)] },
      {
        id: 'col2',
        name: 'Doing',
        orderIndex: 1,
        isDoneColumn: false,
        tasks: [makeTask('t2', 'col2', 1000), makeTask('t3', 'col2', 3000)],
      },
    ],
  };

  it('relocates a task to another column at the exact server-computed position', () => {
    const result = applyTaskMoved(board, 't1', 'col2', 2000);

    const col1 = result.columns.find((c) => c.id === 'col1')!;
    const col2 = result.columns.find((c) => c.id === 'col2')!;
    expect(col1.tasks).toEqual([]);
    expect(col2.tasks.map((t) => t.id)).toEqual(['t2', 't1', 't3']);
    expect(col2.tasks[1]).toMatchObject({ columnId: 'col2', position: 2000 });
  });

  it('reorders within the same column by position', () => {
    const result = applyTaskMoved(board, 't3', 'col2', 500);
    const col2 = result.columns.find((c) => c.id === 'col2')!;
    expect(col2.tasks.map((t) => t.id)).toEqual(['t3', 't2']);
  });

  it('is a no-op when the task id is not found', () => {
    const result = applyTaskMoved(board, 'missing', 'col2', 500);
    expect(result).toBe(board);
  });
});

describe('upsertTaskInBoard', () => {
  const board: BoardResponse = {
    columns: [{ id: 'col1', name: 'Todo', orderIndex: 0, isDoneColumn: false, tasks: [makeTask('t1', 'col1', 1000)] }],
  };

  it('inserts a new task into its column sorted by position', () => {
    const result = upsertTaskInBoard(board, makeTask('t2', 'col1', 500));
    expect(result.columns[0].tasks.map((t) => t.id)).toEqual(['t2', 't1']);
  });

  it('replaces an existing task in place rather than duplicating it', () => {
    const result = upsertTaskInBoard(board, { ...makeTask('t1', 'col1', 1000), title: 'renamed' });
    expect(result.columns[0].tasks).toHaveLength(1);
    expect(result.columns[0].tasks[0].title).toBe('renamed');
  });
});
