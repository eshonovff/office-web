import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { projectsApi } from '~/api/projects';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { CustomInput } from '~/components/shared/CustomInput';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import type { BoardColumn } from '~/types/project';

interface ManageColumnsModalProps {
  projectId: string;
  columns: BoardColumn[];
  open: boolean;
  onClose: () => void;
}

function invalidateBoard(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  void queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
  void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'board'] });
}

function ColumnRow({
  projectId,
  column,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  projectId: string;
  column: BoardColumn;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation('projects');
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [deleting, setDeleting] = useState(false);

  const { mutate: updateColumn, isPending: isSaving } = useMutation({
    mutationFn: (data: { name: string; isDoneColumn: boolean }) => projectsApi.updateColumn(projectId, column.id, data),
    onSuccess: () => {
      invalidateBoard(queryClient, projectId);
      setEditing(false);
    },
  });

  const { mutate: deleteColumn, isPending: isDeleting } = useMutation({
    mutationFn: () => projectsApi.deleteColumn(projectId, column.id),
    onSuccess: () => {
      invalidateBoard(queryClient, projectId);
      toast.success(t('deleteColumnSuccess'));
      setDeleting(false);
    },
  });

  return (
    <div className="flex items-center gap-2 rounded-lg border p-2.5">
      <div className="flex flex-col">
        <Button variant="ghost" size="icon" className="h-5 w-5" disabled={isFirst} onClick={onMoveUp}>
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" disabled={isLast} onClick={onMoveDown}>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <CustomInput value={name} onChange={(e) => setName(e.target.value)} className="h-8" autoFocus />
          <div className="flex items-center gap-1.5">
            <Switch
              size="sm"
              checked={column.isDoneColumn}
              onCheckedChange={(checked) => updateColumn({ name: name.trim() || column.name, isDoneColumn: checked })}
            />
            <Label className="text-2xs">{t('doneColumn')}</Label>
          </div>
          <Button
            size="sm"
            disabled={isSaving || !name.trim()}
            onClick={() => updateColumn({ name: name.trim(), isDoneColumn: column.isDoneColumn })}>
            {t('actions.save', { ns: 'common' })}
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-between">
          <span className="text-sm font-medium">{column.name}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7"
              onClick={() => setDeleting(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={() => deleteColumn()}
        isLoading={isDeleting}
        type="danger"
        title={t('deleteColumnConfirmTitle')}
        description={t('deleteColumnConfirmDescription')}
      />
    </div>
  );
}

export function ManageColumnsModal({ projectId, columns, open, onClose }: ManageColumnsModalProps) {
  const { t } = useTranslation(['projects', 'common']);
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newIsDone, setNewIsDone] = useState(false);

  const { mutate: reorderColumns } = useMutation({
    mutationFn: (columnIds: string[]) => projectsApi.reorderColumns(projectId, { columnIds }),
    onSuccess: () => invalidateBoard(queryClient, projectId),
  });

  const { mutate: createColumn, isPending: isCreating } = useMutation({
    mutationFn: () => projectsApi.createColumn(projectId, { name: newName.trim(), isDoneColumn: newIsDone }),
    onSuccess: () => {
      invalidateBoard(queryClient, projectId);
      toast.success(t('createColumnSuccess'));
      setNewName('');
      setNewIsDone(false);
    },
  });

  const sorted = [...columns].sort((a, b) => a.orderIndex - b.orderIndex);

  function swapAndReorder(index: number, otherIndex: number) {
    const ids = sorted.map((c) => c.id);
    [ids[index], ids[otherIndex]] = [ids[otherIndex], ids[index]];
    reorderColumns(ids);
  }

  return (
    <Modal open={open} onClose={onClose} title={t('manageColumns')}>
      <div className="space-y-3">
        {sorted.map((column, index) => (
          <ColumnRow
            key={column.id}
            projectId={projectId}
            column={column}
            isFirst={index === 0}
            isLast={index === sorted.length - 1}
            onMoveUp={() => swapAndReorder(index, index - 1)}
            onMoveDown={() => swapAndReorder(index, index + 1)}
          />
        ))}

        <div className="flex items-end gap-2 rounded-lg border border-dashed p-2.5">
          <CustomInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('fields.name')}
            className="h-8 flex-1"
          />
          <div className="flex items-center gap-1.5">
            <Switch size="sm" checked={newIsDone} onCheckedChange={setNewIsDone} />
            <Label className="text-2xs">{t('doneColumn')}</Label>
          </div>
          <Button size="sm" disabled={isCreating || !newName.trim()} onClick={() => createColumn()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t('addColumn')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
