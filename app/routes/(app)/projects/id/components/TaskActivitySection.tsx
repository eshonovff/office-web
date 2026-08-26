import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tasksApi } from '~/api/tasks';
import { Label } from '~/components/ui/label';
import { formatDate } from '~/lib/format';
import type { TaskActivityAction } from '~/types/task';

interface TaskActivitySectionProps {
  taskId: string;
}

const KNOWN_ACTIONS: TaskActivityAction[] = [
  'created',
  'updated',
  'moved',
  'assigned',
  'commented',
  'mention',
  'attachment_added',
];

export function TaskActivitySection({ taskId }: TaskActivitySectionProps) {
  const { t } = useTranslation('board');

  const { data: activity = [] } = useQuery({
    queryKey: ['tasks', taskId, 'activity'],
    queryFn: () => tasksApi.listActivity(taskId),
  });

  return (
    <div className="space-y-2">
      <Label>{t('activity')}</Label>

      {activity.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noActivity')}</p>
      ) : (
        <div className="space-y-1.5">
          {activity.map((entry) => (
            <div key={entry.id} className="flex items-baseline justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">{entry.userName}</span>{' '}
                <span className="text-muted-foreground">
                  {(KNOWN_ACTIONS as string[]).includes(entry.action)
                    ? t(`activityAction.${entry.action}`)
                    : entry.action}
                </span>
              </span>
              <span className="text-muted-foreground text-2xs shrink-0">{formatDate(entry.createdAt, true)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
