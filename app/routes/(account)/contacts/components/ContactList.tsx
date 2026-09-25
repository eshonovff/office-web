import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChannelLogo } from '~/components/shared/ChannelLogo';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { formatRelativeTime, formatWindowRemaining } from '~/lib/format';
import { cn } from '~/lib/utils';
import { ContactAvatar } from '~/routes/(account)/chats/components/ContactAvatar';
import type { CustomerContactListItem } from '~/types/customerContacts';
import { contactName } from '../contactName';

interface ContactListProps {
  contacts: CustomerContactListItem[];
  isLoading: boolean;
  isError: boolean;
  filtered: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const TAGS_IN_ROW = 2;

export function ContactList({
  contacts,
  isLoading,
  isError,
  filtered,
  selectedId,
  onSelect,
  hasMore,
  loadingMore,
  onLoadMore,
}: ContactListProps) {
  const { t } = useTranslation('customerAuth');

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-muted-foreground p-6 text-center text-sm">{t('contacts.loadFailed')}</p>;
  }

  if (contacts.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-12 text-center text-sm">
        <Users className="size-8" />
        {filtered ? t('contacts.emptyFiltered') : t('contacts.empty')}
      </div>
    );
  }

  return (
    <ul>
      {contacts.map((contact) => {
        const extraTags = contact.tags.length - TAGS_IN_ROW;
        return (
          <li key={contact.id}>
            <button
              type="button"
              onClick={() => onSelect(contact.id)}
              aria-current={contact.id === selectedId ? 'true' : undefined}
              className={cn(
                'hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                contact.id === selectedId && 'bg-muted'
              )}>
              <span className="relative shrink-0">
                <ContactAvatar name={contactName(contact, '?')} url={contact.avatarUrl} />
                <ChannelLogo
                  type={contact.channelType}
                  label={contact.channelType}
                  className="ring-background absolute -right-0.5 -bottom-0.5 size-4 rounded-full ring-2"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{contactName(contact, t('contacts.fan'))}</span>
                  {contact.canMessageUntil && (
                    <span
                      className="size-2 shrink-0 rounded-full bg-emerald-500"
                      title={t('contacts.canMessage', { left: formatWindowRemaining(contact.canMessageUntil) })}
                      aria-label={t('contacts.canMessage', { left: formatWindowRemaining(contact.canMessageUntil) })}
                    />
                  )}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {contact.username && contact.name ? `@${contact.username} · ` : ''}
                  {contact.lastMessageAt ? formatRelativeTime(contact.lastMessageAt) : ''}
                </span>
              </span>
              {contact.tags.length > 0 && (
                <span className="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-1">
                  {contact.tags.slice(0, TAGS_IN_ROW).map((tag) => (
                    <span key={tag} className="bg-muted max-w-24 truncate rounded px-1.5 py-0.5 text-[11px]">
                      {tag}
                    </span>
                  ))}
                  {extraTags > 0 && <span className="text-muted-foreground text-[11px]">+{extraTags}</span>}
                </span>
              )}
            </button>
          </li>
        );
      })}
      {hasMore && (
        <li className="flex justify-center p-3">
          <Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={onLoadMore}>
            {t('contacts.loadMore')}
          </Button>
        </li>
      )}
    </ul>
  );
}
