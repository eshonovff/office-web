import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { customerChatKeys } from '~/api/customerChats';
import { customerCommentKeys } from '~/api/customerComments';
import { customerContactKeys, customerContactsApi } from '~/api/customerContacts';
import { ChannelLogo } from '~/components/shared/ChannelLogo';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { Badge } from '~/components/ui/badge';
import { Button, buttonVariants } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { formatDate, formatRelativeTime, formatWindowRemaining } from '~/lib/format';
import { cn } from '~/lib/utils';
import { ContactAvatar } from '~/routes/(account)/chats/components/ContactAvatar';
import type { ContactAutomationStatus } from '~/types/customerContacts';
import { contactName } from '../contactName';
import { ContactDetails } from './ContactDetails';
import { ContactTags } from './ContactTags';

interface ContactCardProps {
  contactId: string;
  /** A plan: tags and details can change. Deleting never needs one. */
  canEdit: boolean;
  /** The мизоҷ's tags, offered when adding one. */
  knownTags: string[];
  onBack?: () => void;
  onDeleted: () => void;
}

const STATUS_VARIANT: Record<ContactAutomationStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Finished: 'secondary',
  Active: 'default',
  Waiting: 'outline',
  Failed: 'destructive',
};

// One person: who they are, what the flows learned about them, and what they went through —
// every call to /api/public, where only this мизоҷ's contacts exist.
export function ContactCard({ contactId, canEdit, knownTags, onBack, onDeleted }: ContactCardProps) {
  const { t } = useTranslation(['customerAuth', 'common']);
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const {
    data: contact,
    isLoading,
    isError,
  } = useQuery({
    queryKey: customerContactKeys.detail(contactId),
    queryFn: () => customerContactsApi.get(contactId),
  });

  const remove = useMutation({
    mutationFn: () => customerContactsApi.remove(contactId),
    onSuccess: () => {
      toast.success(t('contacts.deleted'));
      setDeleting(false);
      queryClient.removeQueries({ queryKey: customerContactKeys.detail(contactId) });
      // The person is gone from chats and comments too.
      void queryClient.invalidateQueries({ queryKey: customerContactKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerChatKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerCommentKeys.all });
      onDeleted();
    },
  });

  const backButton = onBack && (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t('contacts.back')}
      onClick={onBack}
      className="-ml-1 shrink-0">
      <ArrowLeft className="size-4" />
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="p-4">
        {backButton}
        <p className="text-muted-foreground py-10 text-center text-sm">{t('contacts.notFound')}</p>
      </div>
    );
  }

  const windowLeft = formatWindowRemaining(contact.canMessageUntil);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-start gap-3 border-b p-4">
        {backButton}
        <ContactAvatar name={contactName(contact, '?')} url={contact.avatarUrl} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{contactName(contact, t('contacts.fan'))}</p>
          <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {contact.username && (
              <a
                href={`https://instagram.com/${encodeURIComponent(contact.username)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground inline-flex items-center gap-0.5 hover:underline">
                @{contact.username}
                <ExternalLink className="size-3" />
              </a>
            )}
            <span className="inline-flex items-center gap-1">
              <ChannelLogo type={contact.channelType} className="size-3" />
              {contact.channelName}
            </span>
          </p>
        </div>
        {/* Under the name on a phone (full width), beside it on a wider screen — the name keeps its room. */}
        <Link
          to={`/account/chats?c=${contact.id}`}
          className={cn(buttonVariants({ size: 'sm' }), 'w-full gap-1.5 sm:w-auto')}>
          <MessageSquare className="size-3.5" />
          {t('contacts.openChat')}
        </Link>
      </div>

      <div className="min-h-0 flex-1 scrollbar-thin space-y-5 overflow-y-auto p-4">
        <p
          className={cn(
            'rounded-lg px-3 py-2 text-xs',
            windowLeft
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-muted/60 text-muted-foreground'
          )}>
          {windowLeft ? t('contacts.canMessage', { left: windowLeft }) : t('contacts.windowClosed')}
        </p>

        <ContactTags contactId={contact.id} tags={contact.tags} canEdit={canEdit} knownTags={knownTags} />
        <ContactDetails contactId={contact.id} variables={contact.variables} canEdit={canEdit} />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('contacts.activity')}</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-muted-foreground">{t('contacts.firstSeen')}</dt>
              <dd>{formatDate(contact.firstSeenAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('contacts.lastMessage')}</dt>
              <dd>{contact.lastMessageAt ? formatRelativeTime(contact.lastMessageAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('contacts.messages')}</dt>
              <dd>{contact.messageCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('contacts.comments')}</dt>
              <dd>{contact.commentCount}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">{t('contacts.follow')}</dt>
              <dd>
                {t(`contacts.followStatus.${contact.followStatus ?? 'none'}`)}
                {contact.followCheckedAt && (
                  <span className="text-muted-foreground"> · {formatDate(contact.followCheckedAt)}</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('contacts.automations')}</h3>
          {contact.automations.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t('contacts.noAutomations')}</p>
          ) : (
            <ul className="space-y-1.5">
              {contact.automations.map((automation) => (
                <li
                  key={`${automation.flowId}-${automation.startedAt}`}
                  className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{automation.flowName}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={STATUS_VARIANT[automation.status]} className="text-[10px]">
                      {t(`contacts.automationStatus.${automation.status}`)}
                    </Badge>
                    <span className="text-muted-foreground">{formatDate(automation.startedAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive gap-1.5"
            onClick={() => setDeleting(true)}>
            <Trash2 className="size-3.5" />
            {t('contacts.delete')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        type="danger"
        title={t('contacts.deleteTitle')}
        description={t('contacts.deleteDescription')}
        confirmText={t('contacts.delete')}
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
