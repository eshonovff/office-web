import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCardView } from './TaskCardView';
import type { TaskListItem } from '~/types/task';

interface TaskCardProps {
  task: TaskListItem;
  onOpen: (taskId: string) => void;
  draggable: boolean;
}

export function TaskCard({ task, onOpen, draggable }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={() => onOpen(task.id)}>
      <TaskCardView
        task={task}
        className={isDragging ? 'opacity-40' : draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
      />
    </div>
  );
}
