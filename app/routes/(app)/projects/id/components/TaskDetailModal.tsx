import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { projectsApi } from '~/api/projects';
import { tasksApi } from '~/api/tasks';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Modal } from '~/components/shared/Modal';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { FormCustomSelect } from '~/components/ui/form/FormCustomSelect';
import { FormDateInput } from '~/components/ui/form/FormDateInput';
import { FormInput } from '~/components/ui/form/FormInput';
import { FormTextarea } from '~/components/ui/form/FormTextarea';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { Permissions } from '~/config/permissions';
import { useAssignTask } from '~/hooks/useAssignTask';
import { useCan } from '~/hooks/useCan';
import { useForm } from '~/hooks/useForm';
import { updateTaskSchema, type UpdateTaskForm } from '~/validations/task';
import type { ProjectMember } from '~/types/project';
import type { TaskPriority } from '~/types/task';
import { useState } from 'react';
import { TaskActivitySection } from './TaskActivitySection';
import { TaskAttachmentsSection } from './TaskAttachmentsSection';
import { TaskCommentsSection } from './TaskCommentsSection';

// office-api's DateTimeOffset? binder 500s on a bare 'YYYY-MM-DD' (no
// time/offset) — the exact format DateInputField produces — so a full ISO
// instant is required instead (see office-api/docs/bug-task-duedate-date-only.md).
// Built by string concatenation, NOT `new Date(value).toISOString()`: routing
// through a local Date would convert "local midnight" to UTC, and for any
// timezone ahead of UTC (e.g. Asia/Dushanbe, UTC+5 — this app's own users)
// that lands on the PREVIOUS calendar day.
function toDueDatePayload(value: string | null | undefined): string | null {
  if (!value) return null;
  return `${value}T00:00:00.000Z`;
}

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

interface TaskDetailModalProps {
  projectId: string;
  taskId: string;
  members: ProjectMember[];
  onClose: () => void;
}

export function TaskDetailModal({ projectId, taskId, members, onClose }: TaskDetailModalProps) {
  const { t } = useTranslation(['board', 'common', 'validation']);
  const { t: tVal } = useTranslation('validation');
  const queryClient = useQueryClient();
  const { can } = useCan();
  const canEdit = can(Permissions.Tasks.Edit);
  const canAssign = can(Permissions.Tasks.Assign);
  const canDelete = can(Permissions.Tasks.Delete);

  const [deleting, setDeleting] = useState(false);

  const boardKey = ['projects', projectId, 'board'] as const;
  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.get(taskId),
  });
  const { data: labels = [] } = useQuery({
    queryKey: ['projects', projectId, 'labels'],
    queryFn: () => projectsApi.listLabels(projectId),
    staleTime: 5 * 60_000,
  });

  const assignTask = useAssignTask(projectId);

  const { control, handleSubmit } = useForm<UpdateTaskForm>({
    resolver: zodResolver(updateTaskSchema(tVal)),
    values: task
      ? { title: task.title, description: task.description ?? '', priority: task.priority, dueDate: task.dueDate }
      : undefined,
  });

  const { mutate: updateTask, isPending: isSaving } = useMutation({
    mutationFn: (data: UpdateTaskForm) =>
      tasksApi.update(taskId, {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        dueDate: toDueDatePayload(data.dueDate),
        labelIds: task?.labels.map((l) => l.id) ?? [],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      void queryClient.invalidateQueries({ queryKey: boardKey });
      toast.success(t('updateSuccess'));
    },
  });

  const { mutate: toggleLabel, isPending: isTogglingLabel } = useMutation({
    mutationFn: (labelIds: string[]) => {
      if (!task) return Promise.reject(new Error('task not loaded'));
      return tasksApi.update(taskId, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        labelIds,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      void queryClient.invalidateQueries({ queryKey: boardKey });
    },
  });

  const { mutate: deleteTask, isPending: isDeleting } = useMutation({
    mutationFn: () => tasksApi.remove(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: boardKey });
      toast.success(t('deleteSuccess'));
      onClose();
    },
  });

  function handleToggleLabel(labelId: string) {
    if (!task) return;
    const current = task.labels.map((l) => l.id);
    const next = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
    toggleLabel(next);
  }

  const assigneeOptions = members.map((m) => ({ value: m.userId, label: m.fullName }));
  const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) }));

  return (
    <Modal
      open
      onClose={onClose}
      title={isLoading || !task ? t('actions.view', { ns: 'common' }) : task.title}
      className="sm:max-w-2xl"
      footer={
        canDelete && task ? (
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive mr-auto gap-1.5"
            onClick={() => setDeleting(true)}>
            <Trash2 className="h-4 w-4" />
            {t('deleteTask')}
          </Button>
        ) : undefined
      }>
      {isLoading || !task ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-40" />
        </div>
      ) : (
        <form id="task-detail-form" className="space-y-4" onSubmit={handleSubmit((data) => updateTask(data))}>
          <FormInput control={control} name="title" label={t('fields.title')} required disabled={!canEdit} />
          <FormTextarea
            control={control}
            name="description"
            label={t('fields.description')}
            disabled={!canEdit}
            rows={4}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormCustomSelect
              control={control}
              name="priority"
              label={t('fields.priority')}
              options={priorityOptions}
              disabled={!canEdit}
            />
            <FormDateInput control={control} name="dueDate" label={t('fields.dueDate')} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('fields.assignee')}</Label>
            <CustomSelect
              options={assigneeOptions}
              value={task.assigneeId}
              onChange={(value) => {
                const member = members.find((m) => m.userId === value);
                assignTask.mutate({ taskId, assigneeId: (value as string) ?? null, assigneeName: member?.fullName ?? null });
              }}
              isClearable
              disabled={!canAssign}
              placeholder={t('unassigned')}
            />
          </div>

          {labels.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t('fields.labels')}</Label>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const active = task.labels.some((l) => l.id === label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      disabled={!canEdit || isTogglingLabel}
                      onClick={() => handleToggleLabel(label.id)}>
                      <Badge
                        variant={active ? 'default' : 'outline'}
                        className={active ? '' : 'text-muted-foreground'}>
                        {label.name}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {canEdit && (
            <Button type="submit" form="task-detail-form" disabled={isSaving}>
              {t('actions.save', { ns: 'common' })}
            </Button>
          )}
        </form>
      )}

      {!isLoading && task && (
        <div className="space-y-4">
          <Separator />
          <TaskAttachmentsSection taskId={taskId} canEdit={canEdit} />

          <Separator />
          <TaskCommentsSection taskId={taskId} members={members} canComment={can(Permissions.Tasks.View)} />

          <Separator />
          <TaskActivitySection taskId={taskId} />
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={() => deleteTask()}
        isLoading={isDeleting}
        type="danger"
        title={t('deleteTaskConfirmTitle')}
        description={t('deleteTaskConfirmDescription')}
      />
    </Modal>
  );
}
