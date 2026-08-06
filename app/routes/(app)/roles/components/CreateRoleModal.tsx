import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form/FormInput';
import { FormTextarea } from '~/components/ui/form/FormTextarea';
import { useForm } from '~/hooks/useForm';
import { createRoleSchema, type CreateRoleForm } from '~/validations/role';

interface CreateRoleModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateRoleForm) => void;
  isCreating: boolean;
}

export function CreateRoleModal({ open, onClose, onCreate, isCreating }: CreateRoleModalProps) {
  const { t } = useTranslation(['roles', 'validation']);
  const { t: tVal } = useTranslation('validation');

  const { control, handleSubmit, reset } = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema(tVal)),
    defaultValues: { key: '', name: '', description: '' },
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
        <Button type="submit" form="create-role-form" disabled={isCreating}>
          {t('create')}
        </Button>
      }>
      <form id="create-role-form" className="space-y-4" onSubmit={handleSubmit((data) => onCreate(data))}>
        <FormInput control={control} name="key" label={t('fields.key')} required placeholder="developer" />
        <FormInput control={control} name="name" label={t('fields.name')} required />
        <FormTextarea control={control} name="description" label={t('fields.description')} />
      </form>
    </Modal>
  );
}
