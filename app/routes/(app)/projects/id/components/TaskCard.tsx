import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { TaskListItem, TaskPriority } from '~/types/task';

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  Low: 'text-muted-foreground border-border',
  Medium: 'text-foreground border-border',
  High: 'text-warning border-warning/30',
  Urgent: 'text-destructive border-destructive/30',
};

interface TaskCardProps {
  task: TaskListItem;
}

export function TaskCard({ task }: TaskCardProps) {
  const { t } = useTranslation('board');

  const initials = task.assigneeName
    ? task.assigneeName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <div className="bg-card space-y-2.5 rounded-lg border p-3 text-sm">
      <p className="leading-snug font-medium">{task.title}</p>

      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <Badge key={label.id} variant="outline" className="text-2xs gap-1">
              {label.color && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: label.color }}
                  aria-hidden="true"
                />
              )}
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn('text-2xs', PRIORITY_CLASS[task.priority])}>
          {t(`priority.${task.priority}`)}
        </Badge>

        <div className="flex items-center gap-2">
          {task.dueDate && <span className="text-muted-foreground text-2xs">{formatDate(task.dueDate)}</span>}
          <Avatar size="sm" title={task.assigneeName ?? t('unassigned')}>
            <AvatarFallback className="text-2xs">{initials ?? '—'}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
