import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { usersApi } from '~/api/users';
import { buildBreadcrumbChain, filterAccessible } from '~/config/breadcrumbs';
import { useCan } from '~/hooks/useCan';
import type { UserDetail } from '~/types/user';

interface EntityQuery {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  select: (data: unknown) => string | undefined;
}

// Reuses the same queryKey/queryFn as the target page's own useQuery, so
// TanStack Query dedupes the request instead of firing a second fetch.
const ENTITY_QUERIES: Partial<Record<string, (params: Record<string, string | undefined>) => EntityQuery>> = {
  '/users/:id': (params) => ({
    queryKey: ['users', params.id],
    queryFn: () => usersApi.get(params.id!),
    select: (data) => (data as UserDetail).fullName,
  }),
};

export interface BreadcrumbItem {
  label: string;
  link?: string;
}

export function useBreadcrumbTrail(): BreadcrumbItem[] {
  const location = useLocation();
  const { t } = useTranslation(['common', 'navigation']);
  const { permissions } = useCan();

  const fromPathname = (location.state as { from?: string } | null)?.from ?? null;
  const chain = filterAccessible(buildBreadcrumbChain(location.pathname, fromPathname), permissions);

  const leaf = chain[chain.length - 1];
  const entityQuery = leaf?.dynamic ? ENTITY_QUERIES[leaf.pattern]?.(leaf.params) : undefined;

  const { data: entityLabel, isLoading } = useQuery({
    queryKey: entityQuery?.queryKey ?? ['breadcrumb-entity-noop'],
    queryFn: entityQuery?.queryFn ?? (() => Promise.resolve(undefined)),
    select: entityQuery?.select,
    enabled: !!entityQuery,
  });

  return chain.map((segment, index) => {
    const isLast = index === chain.length - 1;

    let label: string;
    if (isLast && entityQuery) {
      label = isLoading ? '…' : (entityLabel ?? t(segment.labelKey, { ns: segment.ns }));
    } else {
      label = t(segment.labelKey, { ns: segment.ns });
    }

    return {
      label,
      link: !isLast && segment.accessible ? segment.pathname : undefined,
    };
  });
}
