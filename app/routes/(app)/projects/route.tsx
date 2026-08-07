import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { projectsApi } from '~/api/projects';
import { EmptyState } from '~/components/shared/EmptyState';
import { Panel } from '~/components/layout/Panel';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { CreateProjectModal } from './components/CreateProjectModal';
import type { CreateProjectForm } from '~/validations/project';

export default function ProjectsPage() {
  const { t } = useTranslation(['projects', 'common']);
  const queryClient = useQueryClient();
  const { can } = useCan();
  const canManage = can(Permissions.Projects.Manage);

  const [creating, setCreating] = useState(false);

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });

  const { mutate: createProject, isPending: isCreating } = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('createSuccess'));
      setCreating(false);
    },
  });

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        {canManage && (
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('create')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Panel className="flex h-full flex-col gap-3 transition-colors hover:bg-accent/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {project.color && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-semibold">{project.name}</span>
                  </div>
                  {project.isArchived && (
                    <Badge variant="outline" className="text-2xs">
                      {t('archivedBadge')}
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground text-2xs">{project.key}</span>
              </Panel>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={creating}
        onClose={() => setCreating(false)}
        isCreating={isCreating}
        onCreate={(data: CreateProjectForm) =>
          createProject({ name: data.name, key: data.key, color: data.color || null })
        }
      />
    </div>
  );
}
