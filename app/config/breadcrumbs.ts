import { matchPath } from 'react-router';
import { canAccessRoute } from '~/config/permissions';

/**
 * Base route hierarchy for breadcrumbs. `parent` only points to an
 * immediate logical parent — top-level sidebar sections (/users, /roles)
 * have none, so they're roots of their own sub-tree rather than being
 * chained under the dashboard. `dynamic: true` marks a leaf whose label
 * may be replaced by a live entity name (see useBreadcrumbTrail).
 */
export interface BreadcrumbRouteConfig {
  labelKey: string;
  ns?: string;
  parent?: string;
  dynamic?: boolean;
}

export const BREADCRUMB_ROUTES: Record<string, BreadcrumbRouteConfig> = {
  '/': { labelKey: 'navigation.dashboard' },
  '/users': { labelKey: 'navigation.users' },
  '/users/create': { labelKey: 'usersCreate', ns: 'navigation', parent: '/users' },
  '/users/:id': { labelKey: 'usersDetail', ns: 'navigation', parent: '/users', dynamic: true },
  '/roles': { labelKey: 'navigation.roles' },
  '/roles/:id': { labelKey: 'rolesDetail', ns: 'navigation', parent: '/roles', dynamic: true },
  '/projects': { labelKey: 'navigation.projects' },
  '/projects/:id': { labelKey: 'projectDetail', ns: 'navigation', parent: '/projects', dynamic: true },
  '/change-password': { labelKey: 'changePassword', ns: 'navigation' },
};

export interface BreadcrumbSegment {
  pattern: string;
  pathname: string;
  labelKey: string;
  ns: string;
  dynamic: boolean;
  params: Record<string, string | undefined>;
}

function matchRoute(
  pathname: string
): { pattern: string; config: BreadcrumbRouteConfig; params: Record<string, string | undefined> } | null {
  const matches = Object.entries(BREADCRUMB_ROUTES)
    .map(([pattern, config]) => ({ pattern, config, match: matchPath({ path: pattern, end: true }, pathname) }))
    .filter((m): m is typeof m & { match: NonNullable<(typeof m)['match']> } => m.match !== null);

  if (matches.length === 0) return null;

  matches.sort((a, b) => b.pattern.length - a.pattern.length);
  const { pattern, config, match } = matches[0];
  return { pattern, config, params: match.params };
}

/**
 * Walks `parent` links from `pathname` up to the nearest root. All parents
 * in BREADCRUMB_ROUTES today are static paths, so no param substitution is
 * needed for ancestor segments — only the initially-matched leaf carries
 * real params.
 */
export function getStaticChain(pathname: string): BreadcrumbSegment[] {
  const chain: BreadcrumbSegment[] = [];
  let current = matchRoute(pathname);
  let currentPathname = pathname;
  const seen = new Set<string>();

  while (current && !seen.has(current.pattern)) {
    seen.add(current.pattern);
    chain.unshift({
      pattern: current.pattern,
      pathname: currentPathname,
      labelKey: current.config.labelKey,
      ns: current.config.ns ?? 'common',
      dynamic: current.config.dynamic ?? false,
      params: current.params,
    });

    if (!current.config.parent) break;
    currentPathname = current.config.parent;
    current = matchRoute(currentPathname);
  }

  return chain;
}

/**
 * Base hierarchy (from config) is always the fallback — correct after a
 * refresh or a direct link. When `fromPathname` is known (a Link passed
 * `state: { from: location.pathname }`), it's spliced in front of the
 * static chain so the trail reflects the real navigation path, unless
 * `fromPathname` is already the leaf's configured parent (nothing to add).
 */
export function buildBreadcrumbChain(pathname: string, fromPathname?: string | null): BreadcrumbSegment[] {
  const staticChain = getStaticChain(pathname);
  if (staticChain.length === 0 || !fromPathname) return staticChain;

  const leafParent = BREADCRUMB_ROUTES[staticChain[staticChain.length - 1].pattern]?.parent;
  if (fromPathname === leafParent) return staticChain;

  const fromChain = getStaticChain(fromPathname);
  if (fromChain.length === 0) return staticChain;

  const overlaps = fromChain[fromChain.length - 1].pattern === staticChain[0].pattern;
  return overlaps ? [...fromChain, ...staticChain.slice(1)] : [...fromChain, ...staticChain];
}

export interface AccessibleBreadcrumbSegment extends BreadcrumbSegment {
  accessible: boolean;
}

export function filterAccessible(chain: BreadcrumbSegment[], permissions: string[]): AccessibleBreadcrumbSegment[] {
  return chain.map((segment) => ({ ...segment, accessible: canAccessRoute(segment.pathname, permissions) }));
}
