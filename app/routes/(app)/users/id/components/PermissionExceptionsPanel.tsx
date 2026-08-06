import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Panel } from '~/components/layout/Panel';
import { cn } from '~/lib/utils';
import type { UserPermissionException } from '~/types/user';

interface PermissionExceptionsPanelProps {
  allPermissionKeys: string[];
  rolePermissions: Set<string>;
  exceptions: UserPermissionException[];
  onSave: (exceptions: UserPermissionException[]) => void;
  isSaving: boolean;
}

type ExceptionState = 'granted' | 'denied' | null;

function groupKey(permissionKey: string): string {
  return permissionKey.split('.')[0];
}

export function PermissionExceptionsPanel({
  allPermissionKeys,
  rolePermissions,
  exceptions,
  onSave,
  isSaving,
}: PermissionExceptionsPanelProps) {
  const { t } = useTranslation(['users', 'roles']);

  const initialDraft = useMemo(() => {
    const map = new Map<string, ExceptionState>();
    for (const exception of exceptions) map.set(exception.permissionKey, exception.isGranted ? 'granted' : 'denied');
    return map;
  }, [exceptions]);

  const [draft, setDraft] = useState<Map<string, ExceptionState>>(initialDraft);
  useEffect(() => setDraft(initialDraft), [initialDraft]);

  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of allPermissionKeys) {
      const g = groupKey(key);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(key);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissionKeys]);

  const hasChanges = useMemo(() => {
    if (draft.size !== initialDraft.size) return true;
    for (const [key, state] of draft) if (initialDraft.get(key) !== state) return true;
    return false;
  }, [draft, initialDraft]);

  function setState(key: string, state: ExceptionState) {
    setDraft((prev) => {
      const next = new Map(prev);
      if (state === null) next.delete(key);
      else next.set(key, state);
      return next;
    });
  }

  function handleSave() {
    const exceptions: UserPermissionException[] = [...draft.entries()].map(([permissionKey, state]) => ({
      permissionKey,
      isGranted: state === 'granted',
    }));
    onSave(exceptions);
  }

  return (
    <Panel title={t('detail.exceptionsTitle')} className="space-y-3">
      <p className="text-muted-foreground text-sm">{t('detail.exceptionsHint')}</p>

      <Accordion className="rounded-lg border px-3">
        {groups.map(([group, keys]) => (
          <AccordionItem key={group} value={group}>
            <AccordionTrigger>{t(`permissionGroups.${group}`, { ns: 'roles', defaultValue: group })}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {keys.map((key) => {
                  const state = draft.get(key) ?? null;
                  const fromRole = rolePermissions.has(key);
                  const effective = state === 'granted' || (state === null && fromRole);
                  const effectiveLabel =
                    state === 'granted'
                      ? t('detail.permissionGranted')
                      : state === 'denied'
                        ? t('detail.permissionDenied')
                        : fromRole
                          ? t('detail.permissionFromRole')
                          : t('detail.permissionDefault');

                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-2 rounded-md border p-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex flex-col">
                          <span className="text-sm">{t(`permissionLabels.${key}`, { ns: 'roles', defaultValue: key })}</span>
                          <code className="text-muted-foreground text-2xs">{key}</code>
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-2xs',
                            effective && state !== 'granted' && 'text-muted-foreground',
                            state === 'granted' && 'text-success border-success/30',
                            state === 'denied' && 'text-destructive border-destructive/30'
                          )}>
                          {effectiveLabel}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={state === null ? 'secondary' : 'outline'}
                          onClick={() => setState(key, null)}>
                          {t('detail.permissionFromRole')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={state === 'granted' ? 'default' : 'outline'}
                          onClick={() => setState(key, 'granted')}>
                          {t('detail.permissionGranted')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={state === 'denied' ? 'destructive' : 'outline'}
                          onClick={() => setState(key, 'denied')}>
                          {t('detail.permissionDenied')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Button disabled={!hasChanges || isSaving} onClick={handleSave}>
        {t('detail.saveExceptions')}
      </Button>
    </Panel>
  );
}
