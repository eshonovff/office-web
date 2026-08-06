import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '~/components/ui/checkbox';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import type { RoleListItem } from '~/types/role';

interface PermissionMatrixModalProps {
  role: RoleListItem;
  allPermissionKeys: string[];
  open: boolean;
  onClose: () => void;
  onSave: (permissionKeys: string[]) => void;
  isSaving: boolean;
}

function groupKey(permissionKey: string): string {
  return permissionKey.split('.')[0];
}

export function PermissionMatrixModal({
  role,
  allPermissionKeys,
  open,
  onClose,
  onSave,
  isSaving,
}: PermissionMatrixModalProps) {
  const { t } = useTranslation('roles');
  const [draft, setDraft] = useState<Set<string>>(new Set(role.permissions));

  useEffect(() => setDraft(new Set(role.permissions)), [role.permissions, role.id]);

  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of allPermissionKeys) {
      const g = groupKey(key);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(key);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissionKeys]);

  function toggle(key: string, checked: boolean) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t('editPermissions')} — ${role.name}`}
      footer={
        <Button disabled={isSaving} onClick={() => onSave([...draft])}>
          {t('editPermissions')}
        </Button>
      }>
      <div className="space-y-4">
        {groups.map(([group, keys], i) => (
          <div key={group}>
            {i > 0 && <Separator className="mb-4" />}
            <p className="text-muted-foreground text-2xs mb-2 font-semibold tracking-wider uppercase">
              {t(`permissionGroups.${group}`, { defaultValue: group })}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {keys.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.has(key)}
                    disabled={role.isSystem && role.key === 'owner'}
                    onCheckedChange={(checked) => toggle(key, checked)}
                  />
                  <span className="flex flex-col">
                    <span>{t(`permissionLabels.${key}`, { defaultValue: key })}</span>
                    <code className="text-muted-foreground text-2xs">{key}</code>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
