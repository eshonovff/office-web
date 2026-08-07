import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { TaskCard } from './TaskCard';
import type { BoardColumnWithTasks } from '~/types/task';

interface BoardColumnProps {
  column: BoardColumnWithTasks;
}

export function BoardColumn({ column }: BoardColumnProps) {
  const { t } = useTranslation('board');
  const { setNodeRef } = useDroppable({ id: column.id });
  const taskIds = column.tasks.map((task) => task.id);

  return (
    <div className="bg-sidebar flex w-72 shrink-0 flex-col rounded-xl">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{column.name}</span>
          <span className="text-muted-foreground text-2xs">{column.tasks.length}</span>
        </div>
        {column.isDoneColumn && (
          <Badge variant="outline" className="text-2xs">
            {t('doneBadge')}
          </Badge>
        )}
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 px-2 pb-2">
          {column.tasks.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-2xs">{t('emptyColumn')}</p>
          ) : (
            column.tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}
