import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Tag } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { projectsApi } from '~/api/projects';
import { tasksApi } from '~/api/tasks';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { emptyBoardFilters, type BoardFilters } from '~/lib/taskFilter';
import type { CreateTaskForm } from '~/validations/task';
import { Board } from './components/Board';
import { BoardFilterBar } from './components/BoardFilterBar';
import { CreateTaskModal } from './components/CreateTaskModal';
import { ManageColumnsModal } from './components/ManageColumnsModal';
import { ManageLabelsModal } from './components/ManageLabelsModal';
import { TaskDetailModal } from './components/TaskDetailModal';

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('projects');
  const { can } = useCan();
  const canManage = can(Permissions.Projects.Manage);
  const queryClient = useQueryClient();

  const [managingColumns, setManagingColumns] = useState(false);
  const [managingLabels, setManagingLabels] = useState(false);
  const [creatingInColumn, setCreatingInColumn] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardFilters>(emptyBoardFilters);
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');

  function openTask(taskId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('task', taskId);
        return next;
      },
      { preventScrollReset: true }
    );
  }

  function closeTask() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('task');
        return next;
      },
      { preventScrollReset: true }
    );
  }

  const { data: project } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: board, isLoading } = useQuery({
    queryKey: ['projects', id, 'board'],
    queryFn: () => tasksApi.board(id!),
    enabled: !!id,
  });

  const { mutate: createTask, isPending: isCreatingTask } = useMutation({
    mutationFn: (data: CreateTaskForm) =>
      tasksApi.create({ projectId: id!, columnId: creatingInColumn!, title: data.title, priority: data.priority }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', id, 'board'] });
      toast.success(t('createSuccess', { ns: 'board' }));
      setCreatingInColumn(null);
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{project?.name ?? <Skeleton className="h-6 w-40" />}</h1>
        {canManage && project && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setManagingLabels(true)}>
              <Tag className="h-3.5 w-3.5" />
              {t('manageLabels')}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setManagingColumns(true)}>
              <Settings className="h-3.5 w-3.5" />
              {t('manageColumns')}
            </Button>
          </div>
        )}
      </div>

      {isLoading || !board ? (
        <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-full w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <BoardFilterBar
            projectId={id!}
            members={project?.members ?? []}
            filters={filters}
            onChange={setFilters}
          />
          <Board
            projectId={id!}
            board={board}
            members={project?.members ?? []}
            onOpenTask={openTask}
            onCreateTask={setCreatingInColumn}
            filters={filters}
          />
        </>
      )}

      {project && (
        <ManageColumnsModal
          projectId={id!}
          columns={project.columns}
          open={managingColumns}
          onClose={() => setManagingColumns(false)}
        />
      )}

      {project && (
        <ManageLabelsModal projectId={id!} open={managingLabels} onClose={() => setManagingLabels(false)} />
      )}

      {openTaskId && (
        <TaskDetailModal
          projectId={id!}
          taskId={openTaskId}
          members={project?.members ?? []}
          onClose={closeTask}
        />
      )}

      <CreateTaskModal
        open={creatingInColumn !== null}
        onClose={() => setCreatingInColumn(null)}
        isCreating={isCreatingTask}
        onCreate={(data) => createTask(data)}
      />
    </div>
  );
}
