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
import { useMoveTask } from '~/hooks/useMoveTask';
import { getMoveNeighbors, moveTaskInBoard } from '~/lib/position';
import type { BoardResponse, TaskListItem } from '~/types/task';
import { BoardColumn } from './BoardColumn';
import { TaskDragOverlay } from './TaskDragOverlay';

interface BoardProps {
  projectId: string;
  board: BoardResponse;
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

export function Board({ projectId, board }: BoardProps) {
  const queryClient = useQueryClient();
  const boardKey = ['projects', projectId, 'board'] as const;
  const moveTask = useMoveTask(projectId);

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
    const { active, over } = event;
    if (!over) return;

    const current = queryClient.getQueryData<BoardResponse>(boardKey);
    if (!current) return;

    const activeId = active.id as string;
    const overId = over.id as string;
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

    const current = queryClient.getQueryData<BoardResponse>(boardKey);
    if (!current) return;

    const activeId = active.id as string;
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
      <div className="scrollbar-thin flex flex-1 gap-3 overflow-x-auto pb-2">
        {board.columns.map((column) => (
          <BoardColumn key={column.id} column={column} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskDragOverlay task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}
