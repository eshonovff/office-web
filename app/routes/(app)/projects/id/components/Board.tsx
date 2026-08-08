import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Permissions } from '~/config/permissions';
import { useAssignTask } from '~/hooks/useAssignTask';
import { useCan } from '~/hooks/useCan';
import { useMoveTask } from '~/hooks/useMoveTask';
import { getMoveNeighbors, moveTaskInBoard } from '~/lib/position';
import type { ProjectMember } from '~/types/project';
import type { BoardResponse, TaskListItem } from '~/types/task';
import { ASSIGNEE_DROP_PREFIX, AssigneeAvatar } from './AssigneeAvatar';
import { BoardColumn } from './BoardColumn';
import { TaskDragOverlay } from './TaskDragOverlay';

interface BoardProps {
  projectId: string;
  board: BoardResponse;
  members: ProjectMember[];
  onOpenTask: (taskId: string) => void;
}

function findColumnOfTask(board: BoardResponse, taskId: string) {
  return board.columns.find((column) => column.tasks.some((task) => task.id === taskId));
}

function findTask(board: BoardResponse, taskId: string): TaskListItem | undefined {
  for (const column of board.columns) {
    const task = column.tasks.find((t) => t.id === taskId);
    if (task) return task;
  }
  return undefined;
}

export function Board({ projectId, board, members, onOpenTask }: BoardProps) {
  const { t } = useTranslation('projects');
  const { can } = useCan();
  const canMove = can(Permissions.Tasks.Move);
  const canAssign = can(Permissions.Tasks.Assign);
  const canDrag = canMove || canAssign;

  const queryClient = useQueryClient();
  const boardKey = ['projects', projectId, 'board'] as const;
  const moveTask = useMoveTask(projectId);
  const assignTask = useAssignTask(projectId);

  const [activeTask, setActiveTask] = useState<TaskListItem | null>(null);
  const dragStartSnapshot = useRef<BoardResponse | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    dragStartSnapshot.current = queryClient.getQueryData<BoardResponse>(boardKey);
    setActiveTask(findTask(board, event.active.id as string) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canMove) return; // no live column-reorder preview without permission to actually move

    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    if (overId.startsWith(ASSIGNEE_DROP_PREFIX)) return;

    const current = queryClient.getQueryData<BoardResponse>(boardKey);
    if (!current) return;

    const activeId = active.id as string;
    if (activeId === overId) return;

    const activeColumn = findColumnOfTask(current, activeId);
    const overColumn = current.columns.find((c) => c.id === overId) ?? findColumnOfTask(current, overId);
    if (!activeColumn || !overColumn) return;

    const overIndex = overColumn.tasks.findIndex((task) => task.id === overId);
    const targetIndex = overIndex === -1 ? overColumn.tasks.length : overIndex;

    if (activeColumn.id === overColumn.id) {
      const activeIndex = activeColumn.tasks.findIndex((task) => task.id === activeId);
      if (activeIndex === targetIndex) return;
    }

    queryClient.setQueryData(boardKey, moveTaskInBoard(current, activeId, overColumn.id, targetIndex));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const snapshot = dragStartSnapshot.current;
    dragStartSnapshot.current = undefined;

    const { active, over } = event;
    if (!over || !snapshot) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (overId.startsWith(ASSIGNEE_DROP_PREFIX)) {
      if (!canAssign) return;
      const assigneeId = overId.slice(ASSIGNEE_DROP_PREFIX.length);
      const member = members.find((m) => m.userId === assigneeId);
      assignTask.mutate({ taskId: activeId, assigneeId, assigneeName: member?.fullName ?? null });
      return;
    }

    if (!canMove) return; // onDragOver never touched the cache for this user — nothing to persist or revert

    const current = queryClient.getQueryData<BoardResponse>(boardKey);
    if (!current) return;

    const column = findColumnOfTask(current, activeId);
    if (!column) return;

    const originalColumn = findColumnOfTask(snapshot, activeId);
    const originalIndex = originalColumn?.tasks.findIndex((task) => task.id === activeId) ?? -1;
    const currentIndex = column.tasks.findIndex((task) => task.id === activeId);

    // Dropped back where it started — nothing to persist.
    if (originalColumn?.id === column.id && originalIndex === currentIndex) return;

    const neighborIds = column.tasks.filter((task) => task.id !== activeId).map((task) => task.id);
    const { beforeTaskId, afterTaskId } = getMoveNeighbors(neighborIds, currentIndex);

    moveTask.mutate({
      taskId: activeId,
      payload: { columnId: column.id, beforeTaskId, afterTaskId },
      previousSnapshot: snapshot,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}>
      {members.length > 0 && canAssign && (
        <div className="flex items-center gap-2 pb-1">
          <span className="text-muted-foreground text-2xs">{t('members')}:</span>
          <div className="flex -space-x-2">
            {members.map((member) => (
              <AssigneeAvatar key={member.userId} member={member} />
            ))}
          </div>
        </div>
      )}

      <div className="scrollbar-thin flex flex-1 gap-3 overflow-x-auto pb-2">
        {board.columns.map((column) => (
          <BoardColumn key={column.id} column={column} onOpenTask={onOpenTask} draggable={canDrag} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskDragOverlay task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}
