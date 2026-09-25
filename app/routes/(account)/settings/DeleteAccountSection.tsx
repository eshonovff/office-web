import { useMutation } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { customerAuthApi } from '~/api/customerAuth';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { leaveCustomerArea } from '~/lib/customerSession';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';

/**
 * Deleting the account is irreversible, so it takes two deliberate steps: open the dialog,
 * then type the account's email. The button stays disabled until it matches — and the
 * backend checks the same thing again, so the dialog is a courtesy, not the protection.
 */
export function DeleteAccountSection() {
  const { t } = useTranslation(['customerAuth', 'common']);
  const email = useCustomerAuthStore((s) => s.customer?.email ?? '');
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');

  const matches = email.length > 0 && typed.trim().toLowerCase() === email.toLowerCase();

  const { mutate: deleteAccount, isPending } = useMutation({
    mutationFn: () => customerAuthApi.deleteAccount(typed.trim()),
    onSuccess: () => leaveCustomerArea('accountDeleted'), // the landing page shows the notice
  });

  function close() {
    setOpen(false);
    setTyped('');
  }

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">{t('settings.danger.title')}</CardTitle>
          <CardDescription>{t('settings.danger.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            {t('settings.danger.button')}
          </Button>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={close}
        title={t('settings.danger.confirmTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={isPending}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button variant="destructive" onClick={() => deleteAccount()} disabled={!matches || isPending}>
              {isPending ? t('settings.danger.deleting') : t('settings.danger.confirmButton')}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <div className="border-destructive/40 bg-destructive/5 flex gap-2 rounded-xl border p-3 text-sm">
            <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">{t('settings.danger.irreversible')}</p>
              <p className="text-muted-foreground">{t('settings.danger.whatGoes')}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-email">{t('settings.danger.typeEmail', { email })}</Label>
            <Input
              id="confirm-email"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={email}
              autoComplete="off"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
