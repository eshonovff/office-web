import { TaskCardView } from './TaskCardView';
import type { TaskListItem } from '~/types/task';

interface TaskDragOverlayProps {
  task: TaskListItem;
}

/** Floating clone dnd-kit renders under the cursor while a card is being dragged. */
export function TaskDragOverlay({ task }: TaskDragOverlayProps) {
  return <TaskCardView task={task} className="w-72 rotate-2 shadow-lg" />;
}
