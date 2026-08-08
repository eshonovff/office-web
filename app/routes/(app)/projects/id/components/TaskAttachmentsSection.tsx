import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Paperclip, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { tasksApi } from '~/api/tasks';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { formatDate } from '~/lib/format';

interface TaskAttachmentsSectionProps {
  taskId: string;
  canEdit: boolean;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachmentsSection({ taskId, canEdit }: TaskAttachmentsSectionProps) {
  const { t } = useTranslation('board');
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [] } = useQuery({
    queryKey: ['tasks', taskId, 'attachments'],
    queryFn: () => tasksApi.listAttachments(taskId),
  });

  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => tasksApi.uploadAttachment(taskId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'attachments'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'activity'] });
    },
  });

  const { mutate: download } = useMutation({
    mutationFn: (attachmentId: string) => tasksApi.getAttachmentBlob(taskId, attachmentId),
    onSuccess: (blob, attachmentId) => {
      const fileName = attachments.find((a) => a.id === attachmentId)?.fileName ?? 'file';
      triggerDownload(blob, fileName);
    },
  });

  const { mutate: deleteAttachment } = useMutation({
    mutationFn: (attachmentId: string) => tasksApi.deleteAttachment(taskId, attachmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'attachments'] });
      toast.success(t('deleteSuccess'));
    },
  });

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-2">
      <Label>{t('attachments')}</Label>

      {attachments.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noAttachments')}</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-2 rounded-lg border p-2">
              <Paperclip className="text-muted-foreground h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{attachment.fileName}</p>
                <p className="text-muted-foreground text-2xs">
                  {formatSize(attachment.sizeBytes)} · {formatDate(attachment.createdAt)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => download(attachment.id)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7"
                  onClick={() => deleteAttachment(attachment.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          <input ref={inputRef} type="file" className="hidden" onChange={handlePick} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}>
            {t('uploadFile')}
          </Button>
        </>
      )}
    </div>
  );
}
