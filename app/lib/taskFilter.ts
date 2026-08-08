import type { TaskListItem, TaskPriority } from '~/types/task';

export interface BoardFilters {
  search: string;
  priority: TaskPriority | null;
  assigneeId: string | null;
  labelId: string | null;
}

export const emptyBoardFilters: BoardFilters = {
  search: '',
  priority: null,
  assigneeId: null,
  labelId: null,
};

export function hasActiveFilters(filters: BoardFilters): boolean {
  return !!(filters.search || filters.priority || filters.assigneeId || filters.labelId);
}

/**
 * Board filtering is purely visual (dim non-matching cards, see TaskCard),
 * NOT a removal from the rendered tree — dnd-kit's drag math and the query
 * cache both index off the full, unfiltered task list per column, so
 * actually removing filtered-out cards would desync drop-target indices
 * from what the server (and the optimistic cache write) expect.
 */
export function taskMatchesFilters(task: TaskListItem, filters: BoardFilters): boolean {
  if (filters.priority && task.priority !== filters.priority) return false;
  if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
  if (filters.labelId && !task.labels.some((label) => label.id === filters.labelId)) return false;
  if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
  return true;
}
