import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { createProjectSchema, type CreateProjectForm } from '~/validations/project';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateProjectForm) => void;
  isCreating: boolean;
}

export function CreateProjectModal({ open, onClose, onCreate, isCreating }: CreateProjectModalProps) {
  const { t } = useTranslation(['projects', 'validation']);
  const { t: tVal } = useTranslation('validation');

  const { control, handleSubmit, reset } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema(tVal)),
    defaultValues: { name: '', key: '', color: '' },
  });

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('createTitle')}
      footer={
        <Button type="submit" form="create-project-form" disabled={isCreating}>
          {t('create')}
        </Button>
      }>
      <form id="create-project-form" className="space-y-4" onSubmit={handleSubmit((data) => onCreate(data))}>
        <FormInput control={control} name="name" label={t('fields.name')} required />
        <FormInput control={control} name="key" label={t('fields.key')} required placeholder="OFFICE" />
        <FormInput control={control} name="color" label={t('fields.color')} placeholder="#7C3AED" />
      </form>
    </Modal>
  );
}
