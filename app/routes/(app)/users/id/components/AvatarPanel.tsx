import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usersApi } from '~/api/users';
import { Panel } from '~/components/layout/Panel';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';

const AVATAR_ACCEPT = '.jpg,.jpeg,.png,.webp';

interface AvatarPanelProps {
  userId: string;
  fullName: string;
  hasAvatar: boolean;
  canManage: boolean;
}

export function AvatarPanel({ userId, fullName, hasAvatar, canManage }: AvatarPanelProps) {
  const { t } = useTranslation('users');
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const { data: blob } = useQuery({
    queryKey: ['users', userId, 'avatar'],
    queryFn: () => usersApi.getAvatarBlob(userId),
    enabled: hasAvatar,
  });

  useEffect(() => {
    if (!blob) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const { mutate: upload, isPending } = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(userId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('detail.avatarUpdateSuccess'));
    },
  });

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  }

  return (
    <Panel title={t('detail.avatarTitle')}>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 rounded-lg">
          <AvatarImage src={objectUrl ?? undefined} className="object-cover" />
          <AvatarFallback className="rounded-lg text-lg">{fullName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        {canManage && (
          <div>
            <input ref={inputRef} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={handlePick} />
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}>
              {t('detail.changeAvatar')}
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
