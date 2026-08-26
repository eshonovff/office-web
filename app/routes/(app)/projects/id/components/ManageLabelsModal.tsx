import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { projectsApi } from '~/api/projects';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { CustomInput } from '~/components/shared/CustomInput';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import type { Label as LabelDto } from '~/types/project';

interface ManageLabelsModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const DEFAULT_COLOR = '#94a3b8';

function invalidateLabels(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'labels'] });
}

function LabelRow({ projectId, label }: { projectId: string; label: LabelDto }) {
  const { t } = useTranslation(['projects', 'common']);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color ?? DEFAULT_COLOR);
  const [deleting, setDeleting] = useState(false);

  const { mutate: updateLabel, isPending: isSaving } = useMutation({
    mutationFn: (data: { name: string; color: string }) => projectsApi.updateLabel(projectId, label.id, data),
    onSuccess: () => {
      invalidateLabels(queryClient, projectId);
      setEditing(false);
    },
  });

  const { mutate: deleteLabel, isPending: isDeleting } = useMutation({
    mutationFn: () => projectsApi.deleteLabel(projectId, label.id),
    onSuccess: () => {
      invalidateLabels(queryClient, projectId);
      toast.success(t('deleteLabelSuccess'));
      setDeleting(false);
    },
  });

  return (
    <div className="flex items-center gap-2 rounded-lg border p-2.5">
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded border p-0.5"
          />
          <CustomInput value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1" autoFocus />
          <Button
            size="sm"
            disabled={isSaving || !name.trim()}
            onClick={() => updateLabel({ name: name.trim(), color })}>
            {t('actions.save', { ns: 'common' })}
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 rounded-full border" style={{ backgroundColor: label.color ?? DEFAULT_COLOR }} />
            <span className="text-sm font-medium">{label.name}</span>
          </div>
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
        onConfirm={() => deleteLabel()}
        isLoading={isDeleting}
        type="danger"
        title={t('deleteLabelConfirmTitle')}
        description={t('deleteLabelConfirmDescription')}
      />
    </div>
  );
}

export function ManageLabelsModal({ projectId, open, onClose }: ManageLabelsModalProps) {
  const { t } = useTranslation(['projects', 'common']);
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);

  const { data: labels = [] } = useQuery({
    queryKey: ['projects', projectId, 'labels'],
    queryFn: () => projectsApi.listLabels(projectId),
    enabled: open,
  });

  const { mutate: createLabel, isPending: isCreating } = useMutation({
    mutationFn: () => projectsApi.createLabel(projectId, { name: newName.trim(), color: newColor }),
    onSuccess: () => {
      invalidateLabels(queryClient, projectId);
      toast.success(t('createLabelSuccess'));
      setNewName('');
      setNewColor(DEFAULT_COLOR);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={t('manageLabels')}>
      <div className="space-y-3">
        {labels.map((label) => (
          <LabelRow key={label.id} projectId={projectId} label={label} />
        ))}

        <div className="flex items-end gap-2 rounded-lg border border-dashed p-2.5">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded border p-0.5"
          />
          <CustomInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('fields.name')}
            className="h-8 flex-1"
          />
          <Button size="sm" disabled={isCreating || !newName.trim()} onClick={() => createLabel()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t('addLabel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
