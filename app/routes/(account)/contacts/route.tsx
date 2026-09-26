import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Download, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { customerContactKeys, customerContactsApi } from '~/api/customerContacts';
import { customerChannelsApi } from '~/api/customerFlows';
import { CustomInput } from '~/components/shared/CustomInput';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button, buttonVariants } from '~/components/ui/button';
import { useDebounce } from '~/hooks/useDebounce';
import { useIsMobile } from '~/hooks/use-mobile';
import { CUSTOMER_CHANNELS_QUERY_KEY } from '~/routes/(account)/settings/useInstagramConnect';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import type { ContactsFilter } from '~/types/customerContacts';
import { ContactCard } from './components/ContactCard';
import { ContactList } from './components/ContactList';
import { saveFile } from './contactName';

// Everyone who wrote to the мизоҷ's Instagram. Access is the (account) layout's мизоҷ session;
// every call goes to /api/public, where the tenant filter holds only this мизоҷ's contacts.
// Looking is free; tags, details and the export need a plan (the server refuses otherwise);
// deleting a person's data never does. The same shape as Chats and Comments: list, then card.
export default function ContactsPage() {
  const { t, i18n } = useTranslation('customerAuth');
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasPlan = useCustomerAuthStore((s) => s.customer?.access?.hasAccess ?? false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: channels } = useQuery({ queryKey: CUSTOMER_CHANNELS_QUERY_KEY, queryFn: customerChannelsApi.list });
  // Only one of the мизоҷ's own channels is ever used — an id typed into the URL is ignored.
  const channelParam = searchParams.get('channel');
  const channelId = channels?.some((c) => c.id === channelParam) ? (channelParam ?? undefined) : undefined;
  const tag = searchParams.get('tag') ?? undefined;
  const selectedId = searchParams.get('c');
  const filter: ContactsFilter = { channelId, search: debouncedSearch, tag };
  const filtered = !!(debouncedSearch.trim() || tag || channelId);

  const list = useInfiniteQuery({
    queryKey: customerContactKeys.list(filter),
    queryFn: ({ pageParam }) => customerContactsApi.list(filter, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined),
  });
  const contacts = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.totalCount ?? 0;

  const { data: tags = [] } = useQuery({
    queryKey: customerContactKeys.tags(channelId),
    queryFn: () => customerContactsApi.tags(channelId),
  });

  // A real Excel file (.xlsx) — it opens in columns in any spreadsheet app, whatever its language.
  const exportExcel = useMutation({
    mutationFn: () => customerContactsApi.export(filter, i18n.language === 'ru' ? 'ru' : 'tg'),
    onSuccess: (blob) => saveFile(blob, `${t('contacts.title')} ${dayjs().format('YYYY-MM-DD')}.xlsx`),
  });

  const setParam = (key: string, value: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'c') next.delete('c');
      return next;
    });
  const select = (id: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set('c', id);
        else next.delete('c');
        return next;
      },
      { replace: !isMobile }
    );

  if (channels && channels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Users className="text-muted-foreground size-8" />
        <p className="text-muted-foreground max-w-sm text-sm">{t('contacts.noChannel')}</p>
        <Link to="/account/settings" className={buttonVariants()}>
          {t('contacts.connectInstagram')}
        </Link>
      </div>
    );
  }

  const card = selectedId && (
    <ContactCard
      key={selectedId}
      contactId={selectedId}
      canEdit={hasPlan}
      knownTags={tags.map((x) => x.tag)}
      onBack={isMobile ? () => select(null) : undefined}
      onDeleted={() => select(null)}
    />
  );

  if (isMobile && card) {
    return <div className="bg-background -m-3 h-[calc(100%+1.5rem)]">{card}</div>;
  }

  const header = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('contacts.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {list.data ? t('contacts.count', { count: total }) : t('contacts.subtitle')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          disabled={!hasPlan || exportExcel.isPending || total === 0}
          onClick={() => exportExcel.mutate()}>
          <Download className="size-4" />
          {t('contacts.export')}
        </Button>
      </div>

      {!hasPlan && (
        <p className="bg-muted/60 rounded-lg px-3 py-2 text-xs">
          {t('contacts.readOnlyPlan')}{' '}
          <Link to="/account/billing" className="text-primary hover:underline">
            {t('comments.choosePlan')}
          </Link>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <CustomInput
          className="min-w-48 flex-1"
          startIcon={<Search className="h-3.5 w-3.5" />}
          placeholder={t('contacts.searchPlaceholder')}
          aria-label={t('contacts.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <CustomSelect
          className="w-full sm:w-52"
          placeholder={t('contacts.allTags')}
          isClearable
          options={tags.map((x) => ({ value: x.tag, label: `${x.tag} (${x.count})` }))}
          value={tag ?? null}
          onChange={(v) => setParam('tag', v ? String(v) : null)}
        />
        {channels && channels.length > 1 && (
          <CustomSelect
            className="w-full sm:w-52"
            placeholder={t('contacts.allChannels')}
            isClearable
            options={channels.map((c) => ({ value: c.id, label: c.name }))}
            value={channelId ?? null}
            onChange={(v) => setParam('channel', v ? String(v) : null)}
          />
        )}
      </div>
    </div>
  );

  const contactList = (
    <ContactList
      contacts={contacts}
      isLoading={list.isLoading}
      isError={list.isError}
      filtered={filtered}
      selectedId={selectedId}
      onSelect={select}
      hasMore={!!list.hasNextPage}
      loadingMore={list.isFetchingNextPage}
      onLoadMore={() => void list.fetchNextPage()}
    />
  );

  if (isMobile) {
    return (
      <div className="space-y-3">
        {header}
        <div className="-mx-3 border-t">{contactList}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {header}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border">
        <div className="w-80 shrink-0 scrollbar-thin overflow-y-auto border-r lg:w-96">{contactList}</div>
        <div className="min-w-0 flex-1">
          {card || (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm">
              <Users className="size-8" />
              {t('contacts.pick')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
