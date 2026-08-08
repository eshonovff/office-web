import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { FormCustomSelect } from '~/components/ui/form/FormCustomSelect';
import { FormInput } from '~/components/ui/form/FormInput';
import { useForm } from '~/hooks/useForm';
import { createTaskSchema, type CreateTaskForm } from '~/validations/task';
import type { TaskPriority } from '~/types/task';

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateTaskForm) => void;
  isCreating: boolean;
}

export function CreateTaskModal({ open, onClose, onCreate, isCreating }: CreateTaskModalProps) {
  const { t } = useTranslation(['board', 'validation']);
  const { t: tVal } = useTranslation('validation');

  const { control, handleSubmit, reset } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema(tVal)),
    defaultValues: { title: '', priority: 'Medium' },
  });

  function handleClose() {
    reset();
    onClose();
  }

  const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) }));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('createTitle')}
      footer={
        <Button type="submit" form="create-task-form" disabled={isCreating}>
          {t('createTitle')}
        </Button>
      }>
      <form
        id="create-task-form"
        className="space-y-4"
        onSubmit={handleSubmit((data) => {
          onCreate(data);
          reset();
        })}>
        <FormInput control={control} name="title" label={t('fields.title')} required autoFocus />
        <FormCustomSelect control={control} name="priority" label={t('fields.priority')} options={priorityOptions} />
      </form>
    </Modal>
  );
}
