import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usersApi } from '~/api/users';
import { Panel } from '~/components/layout/Panel';
import { Button } from '~/components/ui/button';

const CONTRACT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

function triggerDownload(blob: Blob) {
  const extension = EXTENSION_BY_MIME[blob.type] ?? 'bin';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `contract-document.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

interface ContractDocumentPanelProps {
  userId: string;
  hasDocument: boolean;
  canManage: boolean;
}

export function ContractDocumentPanel({ userId, hasDocument, canManage }: ContractDocumentPanelProps) {
  const { t } = useTranslation('users');
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => usersApi.uploadContractDocument(userId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('detail.contractUploadSuccess'));
    },
  });

  const { mutate: download, isPending: isDownloading } = useMutation({
    mutationFn: () => usersApi.getContractDocumentBlob(userId),
    onSuccess: triggerDownload,
  });

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  }

  return (
    <Panel title={t('detail.contractTitle')}>
      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" accept={CONTRACT_ACCEPT} className="hidden" onChange={handlePick} />

        {hasDocument ? (
          <Button type="button" variant="outline" className="gap-2" disabled={isDownloading} onClick={() => download()}>
            <FileText className="h-4 w-4" />
            {t('detail.downloadContract')}
          </Button>
        ) : (
          !canManage && <p className="text-muted-foreground text-sm">{t('detail.noContract')}</p>
        )}

        {canManage && (
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}>
            {hasDocument ? t('detail.replaceContract') : t('detail.uploadContract')}
          </Button>
        )}
      </div>
    </Panel>
  );
}
