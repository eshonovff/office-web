import type { BoardResponse, TaskListItem } from '~/types/task';

export interface MoveNeighbors {
  beforeTaskId: string | null;
  afterTaskId: string | null;
}

/**
 * Given a column's task ids in display order (NOT including the task being
 * moved) and the index it should land at, returns the neighbor ids the
 * server's PositionCalculator needs: the moved task ends up strictly after
 * `afterTaskId` and before `beforeTaskId`.
 */
export function getMoveNeighbors(orderedTaskIds: string[], targetIndex: number): MoveNeighbors {
  const clamped = Math.max(0, Math.min(targetIndex, orderedTaskIds.length));
  return {
    afterTaskId: clamped > 0 ? orderedTaskIds[clamped - 1] : null,
    beforeTaskId: clamped < orderedTaskIds.length ? orderedTaskIds[clamped] : null,
  };
}

/**
 * Pure optimistic reorder of a board: removes `taskId` from wherever it
 * currently sits and reinserts it into `toColumnId` at `toIndex`. The
 * recomputed `position` is a client-side midpoint estimate — good enough
 * for the optimistic render, since we never invalidate after a successful
 * move (the server's own midpoint algorithm lands on the same order; the
 * exact position value only matters for future inserts, which always ask
 * the server for board of a fresh position anyway on the next real fetch).
 */
export function moveTaskInBoard(
  board: BoardResponse,
  taskId: string,
  toColumnId: string,
  toIndex: number
): BoardResponse {
  let moving: TaskListItem | undefined;
  const withoutTask = board.columns.map((column) => {
    const index = column.tasks.findIndex((task) => task.id === taskId);
    if (index === -1) return column;
    moving = column.tasks[index];
    return { ...column, tasks: [...column.tasks.slice(0, index), ...column.tasks.slice(index + 1)] };
  });

  if (!moving) return board;
  const movingTask = moving;

  return {
    columns: withoutTask.map((column) => {
      if (column.id !== toColumnId) return column;

      const tasks = [...column.tasks];
      const clamped = Math.max(0, Math.min(toIndex, tasks.length));
      const before = tasks[clamped - 1]?.position;
      const after = tasks[clamped]?.position;
      const position =
        before !== undefined && after !== undefined
          ? (before + after) / 2
          : before !== undefined
            ? before + 1000
            : after !== undefined
              ? after - 1000
              : 1000;

      tasks.splice(clamped, 0, { ...movingTask, columnId: toColumnId, position });
      return { ...column, tasks };
    }),
  };
}

/** Pure optimistic update of a task's assignee, wherever it sits in the board. */
export function assignTaskInBoard(
  board: BoardResponse,
  taskId: string,
  assigneeId: string | null,
  assigneeName: string | null
): BoardResponse {
  return {
    columns: board.columns.map((column) => ({
      ...column,
      tasks: column.tasks.map((task) => (task.id === taskId ? { ...task, assigneeId, assigneeName } : task)),
    })),
  };
}

/** Removes a task from wherever it sits. No-op if it's not on the board. */
export function removeTaskFromBoard(board: BoardResponse, taskId: string): BoardResponse {
  return {
    columns: board.columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => task.id !== taskId),
    })),
  };
}

/**
 * Applies a realtime TaskMoved event: relocates `taskId` (removing it from
 * its current column if present) into `columnId` at the slot its absolute
 * `position` sorts into among that column's existing tasks. Unlike
 * moveTaskInBoard (which takes a display index from a live drag), this takes
 * the exact position value the server already computed, so no midpoint
 * recalculation is needed.
 */
export function applyTaskMoved(board: BoardResponse, taskId: string, columnId: string, position: number): BoardResponse {
  let moving: TaskListItem | undefined;
  const withoutTask = board.columns.map((column) => {
    const index = column.tasks.findIndex((task) => task.id === taskId);
    if (index === -1) return column;
    moving = column.tasks[index];
    return { ...column, tasks: [...column.tasks.slice(0, index), ...column.tasks.slice(index + 1)] };
  });

  if (!moving) return board;
  const movingTask: TaskListItem = { ...moving, columnId, position };

  return {
    columns: withoutTask.map((column) => {
      if (column.id !== columnId) return column;
      const tasks = [...column.tasks];
      const insertAt = tasks.findIndex((task) => task.position > position);
      tasks.splice(insertAt === -1 ? tasks.length : insertAt, 0, movingTask);
      return { ...column, tasks };
    }),
  };
}

/**
 * Applies a realtime TaskCreated event: inserts `task` into its column
 * sorted by position, or replaces it in place if a stale copy is already
 * present (e.g. the create response and the broadcast both landing).
 */
export function upsertTaskInBoard(board: BoardResponse, task: TaskListItem): BoardResponse {
  const withoutTask = removeTaskFromBoard(board, task.id);
  return {
    columns: withoutTask.columns.map((column) => {
      if (column.id !== task.columnId) return column;
      const tasks = [...column.tasks];
      const insertAt = tasks.findIndex((t) => t.position > task.position);
      tasks.splice(insertAt === -1 ? tasks.length : insertAt, 0, task);
      return { ...column, tasks };
    }),
  };
}
