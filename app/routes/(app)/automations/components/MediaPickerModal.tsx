import { useInfiniteQuery } from '@tanstack/react-query';
import { useFlowBuilderApi } from '~/lib/flowBuilderApi';
import { Check, Film } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { UniversalImage } from '~/components/shared/UniversalImage';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';

interface MediaPickerModalProps {
  channelId: string;
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

export function MediaPickerModal({ channelId, open, selectedIds, onClose, onConfirm }: MediaPickerModalProps) {
  const flowApi = useFlowBuilderApi();
  const { t } = useTranslation('instagramAutomation');
  const [draftSelection, setDraftSelection] = useState<string[]>(selectedIds);
  const [tab, setTab] = useState<'all' | 'selected'>('all');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['instagram-media', channelId],
    queryFn: ({ pageParam }: { pageParam?: string }) => flowApi.listInstagramMedia(channelId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: open,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const visibleItems = tab === 'selected' ? items.filter((i) => draftSelection.includes(i.id)) : items;

  function toggle(id: string) {
    setDraftSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('mediaPicker.title')}
      className="sm:max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-muted-foreground text-2xs">
            {t('postsSelectedCount', { count: draftSelection.length })}
          </span>
          <Button
            type="button"
            onClick={() => {
              onConfirm(draftSelection);
            }}>
            {t('actions.confirm')}
          </Button>
        </div>
      }>
      <div className="mb-3 flex gap-2">
        <Button type="button" size="sm" variant={tab === 'all' ? 'default' : 'outline'} onClick={() => setTab('all')}>
          {t('mediaPicker.allPosts')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'selected' ? 'default' : 'outline'}
          onClick={() => setTab('selected')}>
          {t('mediaPicker.selectedPosts')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t('mediaPicker.empty')}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {visibleItems.map((item) => {
              const isSelected = draftSelection.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'relative aspect-square overflow-hidden rounded-lg border-2 transition-colors',
                    isSelected ? 'border-primary' : 'border-transparent'
                  )}>
                  <UniversalImage src={item.imageUrl} alt={item.caption ?? ''} containerClassName="h-full w-full" />
                  {item.mediaType === 'VIDEO' && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 p-0.5">
                      <Film className="h-3 w-3 text-white" />
                    </span>
                  )}
                  <span
                    className={cn(
                      'absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white',
                      isSelected ? 'bg-primary' : 'bg-black/30'
                    )}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          {tab === 'all' && hasNextPage && (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}>
                {t('mediaPicker.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
