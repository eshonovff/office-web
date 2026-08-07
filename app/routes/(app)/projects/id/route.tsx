import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { projectsApi } from '~/api/projects';
import { tasksApi } from '~/api/tasks';
import { Skeleton } from '~/components/ui/skeleton';
import { Board } from './components/Board';

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">{project?.name ?? <Skeleton className="h-6 w-40" />}</h1>

      {isLoading || !board ? (
        <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-full w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <Board projectId={id!} board={board} />
      )}
    </div>
  );
}
