import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '~/api/projects';
import { CustomInput } from '~/components/shared/CustomInput';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button } from '~/components/ui/button';
import { emptyBoardFilters, type BoardFilters } from '~/lib/taskFilter';
import type { ProjectMember } from '~/types/project';
import type { TaskPriority } from '~/types/task';

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

interface BoardFilterBarProps {
  projectId: string;
  members: ProjectMember[];
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
}

export function BoardFilterBar({ projectId, members, filters, onChange }: BoardFilterBarProps) {
  const { t } = useTranslation(['board', 'common']);

  const { data: labels = [] } = useQuery({
    queryKey: ['projects', projectId, 'labels'],
    queryFn: () => projectsApi.listLabels(projectId),
    staleTime: 5 * 60_000,
  });

  const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) }));
  const assigneeOptions = members.map((m) => ({ value: m.userId, label: m.fullName }));
  const labelOptions = labels.map((l) => ({ value: l.id, label: l.name }));

  const isFiltered = !!(filters.search || filters.priority || filters.assigneeId || filters.labelId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CustomInput
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder={t('search', { ns: 'common' })}
        startIcon={<Search className="h-3.5 w-3.5" />}
        className="h-8 w-48"
      />
      <CustomSelect
        options={priorityOptions}
        value={filters.priority}
        onChange={(value) => onChange({ ...filters, priority: (value as TaskPriority) ?? null })}
        isClearable
        placeholder={t('fields.priority')}
        className="w-36"
      />
      {assigneeOptions.length > 0 && (
        <CustomSelect
          options={assigneeOptions}
          value={filters.assigneeId}
          onChange={(value) => onChange({ ...filters, assigneeId: (value as string) ?? null })}
          isClearable
          placeholder={t('fields.assignee')}
          className="w-40"
        />
      )}
      {labelOptions.length > 0 && (
        <CustomSelect
          options={labelOptions}
          value={filters.labelId}
          onChange={(value) => onChange({ ...filters, labelId: (value as string) ?? null })}
          isClearable
          placeholder={t('fields.labels')}
          className="w-36"
        />
      )}
      {isFiltered && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(emptyBoardFilters)}>
          {t('filters.reset', { ns: 'common' })}
        </Button>
      )}
    </div>
  );
}
