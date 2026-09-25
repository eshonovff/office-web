import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { customerContactKeys, customerContactsApi } from '~/api/customerContacts';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import type { ContactVariable } from '~/types/customerContacts';

// Same bounds as the backend (ContactLimits).
const MAX_KEY_LENGTH = 100;
const MAX_VALUE_LENGTH = 2000;

interface ContactDetailsProps {
  contactId: string;
  variables: ContactVariable[];
  canEdit: boolean;
}

// What the flows collected about a person (name, phone, …): shown as "name — value", corrected
// or removed by hand, or added (e.g. a phone taken over the phone).
export function ContactDetails({ contactId, variables, canEdit }: ContactDetailsProps) {
  const { t } = useTranslation(['customerAuth', 'common']);
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const refresh = () => void queryClient.invalidateQueries({ queryKey: customerContactKeys.all });
  const save = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      customerContactsApi.setVariable(contactId, key, value),
    onSuccess: () => {
      setEditingKey(null);
      setAdding(false);
      setNewKey('');
      setNewValue('');
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (key: string) => customerContactsApi.removeVariable(contactId, key),
    onSettled: refresh,
  });

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{t('contacts.details')}</h3>
      {variables.length === 0 && !adding && <p className="text-muted-foreground text-xs">{t('contacts.noDetails')}</p>}

      <dl className="space-y-1.5">
        {variables.map((variable) => (
          <div key={variable.key} className="bg-muted/40 rounded-lg px-3 py-2 text-xs">
            <dt className="text-muted-foreground">{variable.key}</dt>
            {editingKey === variable.key ? (
              <form
                className="mt-1 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim()) save.mutate({ key: variable.key, value: draft.trim() });
                }}>
                <Input
                  autoFocus
                  maxLength={MAX_VALUE_LENGTH}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label={variable.key}
                  className="h-8"
                />
                <Button type="submit" size="sm" disabled={!draft.trim() || save.isPending}>
                  {t('actions.save', { ns: 'common' })}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingKey(null)}>
                  {t('actions.cancel', { ns: 'common' })}
                </Button>
              </form>
            ) : (
              <dd className="flex items-start justify-between gap-2">
                <span className="text-sm break-words whitespace-pre-wrap">{variable.value}</span>
                {canEdit && (
                  <span className="flex shrink-0 gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('contacts.editDetail', { key: variable.key })}
                      onClick={() => {
                        setEditingKey(variable.key);
                        setDraft(variable.value);
                      }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('contacts.removeDetail', { key: variable.key })}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(variable.key)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                )}
              </dd>
            )}
          </div>
        ))}
      </dl>

      {canEdit &&
        (adding ? (
          <form
            className="space-y-2 rounded-lg border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (newKey.trim() && newValue.trim()) save.mutate({ key: newKey.trim(), value: newValue.trim() });
            }}>
            <Input
              autoFocus
              maxLength={MAX_KEY_LENGTH}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={t('contacts.detailKey')}
              aria-label={t('contacts.detailKey')}
              className="h-8"
            />
            <Input
              maxLength={MAX_VALUE_LENGTH}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={t('contacts.detailValue')}
              aria-label={t('contacts.detailValue')}
              className="h-8"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!newKey.trim() || !newValue.trim() || save.isPending}>
                {t('actions.save', { ns: 'common' })}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                {t('actions.cancel', { ns: 'common' })}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setAdding(true)}>
            <Plus className="size-3" />
            {t('contacts.addDetail')}
          </Button>
        ))}
    </section>
  );
}
