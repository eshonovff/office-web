import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel } from '~/components/layout/Panel';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import type { RoleListItem } from '~/types/role';

interface RolesPanelProps {
  roles: RoleListItem[];
  selectedRoleIds: string[];
  onSave: (roleIds: string[]) => void;
  isSaving: boolean;
}

export function RolesPanel({ roles, selectedRoleIds, onSave, isSaving }: RolesPanelProps) {
  const { t } = useTranslation('users');
  const [draft, setDraft] = useState<string[]>(selectedRoleIds);

  useEffect(() => setDraft(selectedRoleIds), [selectedRoleIds]);

  const hasChanges = draft.length !== selectedRoleIds.length || draft.some((id) => !selectedRoleIds.includes(id));

  function toggle(roleId: string, checked: boolean) {
    setDraft((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)));
  }

  return (
    <Panel title={t('detail.rolesTitle')} className="space-y-3">
      <p className="text-muted-foreground text-sm">{t('detail.rolesHint')}</p>
      <div className="space-y-2">
        {roles.map((role) => (
          <label
            key={role.id}
            className="hover:bg-accent/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3">
            <Checkbox checked={draft.includes(role.id)} onCheckedChange={(checked) => toggle(role.id, checked)} />
            <div className="flex flex-1 items-center gap-2">
              <span className="text-sm font-medium">{role.name}</span>
              {role.isSystem && (
                <Badge variant="outline" className="text-2xs">
                  {t('systemBadge', { ns: 'roles' })}
                </Badge>
              )}
            </div>
          </label>
        ))}
      </div>
      <Button disabled={!hasChanges || isSaving} onClick={() => onSave(draft)}>
        {t('detail.saveRoles')}
      </Button>
    </Panel>
  );
}
