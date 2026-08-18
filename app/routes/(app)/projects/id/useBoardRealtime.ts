import type { HubConnection } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSignalR } from '~/hooks/useSignalR';
import { applyTaskMoved, removeTaskFromBoard, upsertTaskInBoard } from '~/lib/position';
import { createHubConnection } from '~/lib/signalr';
import type { BoardResponse, TaskDetail, TaskListItem } from '~/types/task';

function toListItem(detail: TaskDetail): TaskListItem {
  return {
    id: detail.id,
    projectId: detail.projectId,
    columnId: detail.columnId,
    title: detail.title,
    assigneeId: detail.assigneeId,
    assigneeName: detail.assigneeName,
    priority: detail.priority,
    dueDate: detail.dueDate,
    position: detail.position,
    labels: detail.labels,
  };
}

/**
 * Keeps a project's board live via /hubs/board. Unlike the shared inbox hub,
 * BoardHub (Office.Api/Realtime/BoardHub.cs) reads `projectId` off the
 * connection's query string at connect time and checks project access before
 * joining the group — there's no post-connect "JoinChannel" invoke — so each
 * project needs its own connection rather than joining/leaving groups on one
 * shared connection.
 *
 * `openTaskId` is the task currently shown in TaskDetailModal, if any — the
 * CommentAdded broadcast doesn't carry a taskId (see TaskCommentDto), so
 * that's the best targeting available for it.
 */
export function useBoardRealtime(projectId: string | undefined, openTaskId?: string | null) {
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<HubConnection | null>(null);

  useEffect(() => {
    setConnection(null);
    if (!projectId) return;

    let cancelled = false;
    const conn = createHubConnection(`/hubs/board?projectId=${projectId}`);

    // Deferred one tick for the same reason as useRealtimeConnection: React
    // StrictMode's synthetic mount/cleanup/mount in dev would otherwise start
    // a connection that's immediately torn down, logging a misleading failure.
    const startTimer = window.setTimeout(() => {
      conn
        .start()
        .then(() => {
          if (!cancelled) setConnection(conn);
        })
        .catch(() => undefined);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      void conn.stop();
    };
  }, [projectId]);

  useSignalR(connection, {
    TaskCreated: (payload: unknown) => {
      if (!projectId) return;
      const task = toListItem(payload as TaskDetail);
      queryClient.setQueryData<BoardResponse>(['projects', projectId, 'board'], (old) =>
        old ? upsertTaskInBoard(old, task) : old
      );
    },
    TaskMoved: (payload: unknown) => {
      if (!projectId) return;
      const { taskId, columnId, position } = payload as { taskId: string; columnId: string; position: number };
      queryClient.setQueryData<BoardResponse>(['projects', projectId, 'board'], (old) =>
        old ? applyTaskMoved(old, taskId, columnId, position) : old
      );
    },
    TaskDeleted: (payload: unknown) => {
      if (!projectId) return;
      const { taskId } = payload as { taskId: string };
      queryClient.setQueryData<BoardResponse>(['projects', projectId, 'board'], (old) =>
        old ? removeTaskFromBoard(old, taskId) : old
      );
    },
    // Payload shape varies with the endpoint that triggered it — a full
    // TaskDetail from edits, or a bare {taskId, assigneeId} patch from assign
    // (TasksEndpoints.UpdateAsync vs AssignAsync) — so a precise cache patch
    // can't handle both. Refetching is simple and cheap enough for an event
    // this infrequent.
    TaskUpdated: () => {
      if (!projectId) return;
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'board'] });
    },
    CommentAdded: () => {
      if (!openTaskId) return;
      void queryClient.invalidateQueries({ queryKey: ['tasks', openTaskId, 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', openTaskId, 'activity'] });
    },
  });
}
