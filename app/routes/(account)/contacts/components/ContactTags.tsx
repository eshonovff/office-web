import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { customerContactKeys, customerContactsApi } from '~/api/customerContacts';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

// Same bound as the backend (ContactLimits.MaxTagLength).
const MAX_TAG_LENGTH = 100;
const SUGGESTIONS = 8;

interface ContactTagsProps {
  contactId: string;
  tags: string[];
  canEdit: boolean;
  knownTags: string[];
}

export function ContactTags({ contactId, tags, canEdit, knownTags }: ContactTagsProps) {
  const { t } = useTranslation(['customerAuth', 'common']);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');

  const refresh = () => void queryClient.invalidateQueries({ queryKey: customerContactKeys.all });
  const add = useMutation({
    mutationFn: (tag: string) => customerContactsApi.addTag(contactId, tag),
    onSuccess: () => {
      setValue('');
      setAdding(false);
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (tag: string) => customerContactsApi.removeTag(contactId, tag),
    onSettled: refresh,
  });

  const suggestions = knownTags.filter((tag) => !tags.includes(tag)).slice(0, SUGGESTIONS);
  const submit = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !add.isPending) add.mutate(trimmed);
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{t('contacts.tags')}</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="bg-muted inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs">
            <span className="truncate">{tag}</span>
            {canEdit && (
              <button
                type="button"
                aria-label={t('contacts.removeTag', { tag })}
                disabled={remove.isPending}
                onClick={() => remove.mutate(tag)}
                className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {tags.length === 0 && !adding && <span className="text-muted-foreground text-xs">{t('contacts.noTags')}</span>}
        {canEdit && !adding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setAdding(true)}>
            <Plus className="size-3" />
            {t('contacts.addTag')}
          </Button>
        )}
      </div>

      {adding && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}>
          <div className="flex gap-2">
            <Input
              autoFocus
              maxLength={MAX_TAG_LENGTH}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('contacts.tagPlaceholder')}
              aria-label={t('contacts.tagPlaceholder')}
              className="h-8"
            />
            <Button type="submit" size="sm" disabled={!value.trim() || add.isPending}>
              {t('contacts.add')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setValue('');
              }}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => submit(tag)}
                  className="hover:bg-muted max-w-40 truncate rounded-md border px-2 py-0.5 text-xs">
                  {tag}
                </button>
              ))}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
