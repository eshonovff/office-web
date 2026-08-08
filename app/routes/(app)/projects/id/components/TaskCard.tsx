import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '~/lib/utils';
import { TaskCardView } from './TaskCardView';
import type { TaskListItem } from '~/types/task';

interface TaskCardProps {
  task: TaskListItem;
  onOpen: (taskId: string) => void;
  draggable: boolean;
  matchesFilter: boolean;
}

export function TaskCard({ task, onOpen, draggable, matchesFilter }: TaskCardProps) {
  const dragEnabled = draggable && matchesFilter;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !dragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(dragEnabled ? attributes : {})}
      {...(dragEnabled ? listeners : {})}
      onClick={() => onOpen(task.id)}>
      <TaskCardView
        task={task}
        className={cn(
          !matchesFilter && 'opacity-35',
          isDragging ? 'opacity-40' : dragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        )}
      />
    </div>
  );
}
