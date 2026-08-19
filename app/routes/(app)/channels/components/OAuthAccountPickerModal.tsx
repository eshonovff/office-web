import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/shared/Modal';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { OAuthProvider } from '~/types/channel';
import type { useOAuthConnectFlow } from '../useOAuthConnectFlow';

interface OAuthAccountPickerModalProps {
  provider: OAuthProvider;
  flow: ReturnType<typeof useOAuthConnectFlow>;
}

/**
 * One modal per provider, driven entirely by that provider's useOAuthConnectFlow
 * instance — open whenever the flow isn't idle. Covers both "waiting on the
 * popup" and "confirm which account" without being two separate modals, since
 * the transition between them isn't something the user acts on.
 */
export function OAuthAccountPickerModal({ provider, flow }: OAuthAccountPickerModalProps) {
  const { t } = useTranslation('inbox');
  const open = flow.phase !== 'idle';
  const canConfirm = flow.phase === 'accounts' || flow.phase === 'connecting';

  return (
    <Modal
      open={open}
      onClose={flow.cancel}
      title={t(`connect${provider}`)}
      footer={
        canConfirm ? (
          <Button
            type="button"
            className="gap-1.5"
            disabled={!flow.selectedExternalId || flow.phase === 'connecting'}
            onClick={() => void flow.confirm()}>
            {flow.phase === 'connecting' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {t('connect')}
          </Button>
        ) : undefined
      }>
      {flow.phase === 'waiting' ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-muted-foreground text-sm">{t('oauthWaitingBody')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-2xs">{t('oauthAccountsHint')}</p>
          {flow.accounts.map((account) => {
            const selected = account.externalId === flow.selectedExternalId;
            const alreadyConnected = flow.isAlreadyConnected(account.externalId);
            return (
              <button
                key={account.externalId}
                type="button"
                aria-pressed={selected}
                disabled={flow.phase === 'connecting'}
                onClick={() => flow.selectAccount(account.externalId)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50',
                  selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
                )}>
                <div className="flex min-w-0 items-center gap-2">
                  {selected && <Check className="text-primary h-4 w-4 shrink-0" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{account.name}</p>
                    <p className="text-muted-foreground truncate text-2xs">{account.externalId}</p>
                  </div>
                </div>
                {alreadyConnected && (
                  <Badge variant="outline" className="shrink-0 text-2xs">
                    {t('oauthAlreadyConnected')}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
