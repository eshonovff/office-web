import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { updateProjectSchema, type UpdateProjectForm } from '~/validations/project';
import type { ProjectListItem } from '~/types/project';

interface EditProjectModalProps {
  project: ProjectListItem;
  open: boolean;
  onClose: () => void;
  onSave: (data: UpdateProjectForm) => void;
  isSaving: boolean;
}

export function EditProjectModal({ project, open, onClose, onSave, isSaving }: EditProjectModalProps) {
  const { t } = useTranslation(['projects', 'validation']);
  const { t: tVal } = useTranslation('validation');

  const { control, handleSubmit } = useForm<UpdateProjectForm>({
    resolver: zodResolver(updateProjectSchema(tVal)),
    values: { name: project.name, color: project.color ?? '' },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('editTitle')}
      footer={
        <Button type="submit" form="edit-project-form" disabled={isSaving}>
          {t('actions.save', { ns: 'common' })}
        </Button>
      }>
      <form id="edit-project-form" className="space-y-4" onSubmit={handleSubmit((data) => onSave(data))}>
        <FormInput control={control} name="name" label={t('fields.name')} required />
        <FormInput control={control} name="color" label={t('fields.color')} placeholder="#7C3AED" />
      </form>
    </Modal>
  );
}
