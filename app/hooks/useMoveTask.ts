import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '~/api/tasks';
import type { BoardResponse, MoveTaskRequest } from '~/types/task';

interface MoveTaskVariables {
  taskId: string;
  payload: MoveTaskRequest;
  /** Board snapshot captured at drag-start, before any live reordering. */
  previousSnapshot: BoardResponse | undefined;
}

export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  const boardKey = ['projects', projectId, 'board'] as const;

  return useMutation({
    mutationFn: ({ taskId, payload }: MoveTaskVariables) => tasksApi.move(taskId, payload),
    // The card already moved live in the query cache during the drag
    // (onDragOver in Board.tsx writes straight to it so the card follows
    // the cursor across columns). onMutate here isn't the one performing
    // that optimistic write — it just cancels any in-flight board refetch
    // so it can't clobber the already-applied optimistic state before the
    // server responds. The rollback target is `previousSnapshot`, captured
    // at drag-start, not a live read here — by the time this runs the
    // cache already reflects the drop, so a live read would "roll back" to
    // the wrong (already-moved) state.
    onMutate: async ({ previousSnapshot }: MoveTaskVariables) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      return { previous: previousSnapshot };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
    },
    // No onSettled invalidation — PATCH /tasks/{id}/move returns 204, and
    // the server's own midpoint position algorithm agrees with the order
    // we already applied optimistically, so refetching would just replay it.
  });
}
