import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '~/api/tasks';
import { assignTaskInBoard } from '~/lib/position';
import type { BoardResponse } from '~/types/task';

interface AssignTaskVariables {
  taskId: string;
  assigneeId: string | null;
  assigneeName: string | null;
}

export function useAssignTask(projectId: string) {
  const queryClient = useQueryClient();
  const boardKey = ['projects', projectId, 'board'] as const;

  return useMutation({
    mutationFn: ({ taskId, assigneeId }: AssignTaskVariables) => tasksApi.assign(taskId, { assigneeId }),
    onMutate: async ({ taskId, assigneeId, assigneeName }: AssignTaskVariables) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<BoardResponse>(boardKey);
      if (previous) {
        queryClient.setQueryData(boardKey, assignTaskInBoard(previous, taskId, assigneeId, assigneeName));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
    },
  });
}
