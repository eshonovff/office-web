import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCardView } from './TaskCardView';
import type { TaskListItem } from '~/types/task';

interface TaskCardProps {
  task: TaskListItem;
}

export function TaskCard({ task }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCardView task={task} className={isDragging ? 'opacity-40' : 'cursor-grab active:cursor-grabbing'} />
    </div>
  );
}
