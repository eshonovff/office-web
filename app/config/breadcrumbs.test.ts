import { describe, expect, it } from 'vitest';
import { buildBreadcrumbChain, filterAccessible } from '~/config/breadcrumbs';
import { Permissions } from '~/config/permissions';

describe('buildBreadcrumbChain', () => {
  it('builds the static hierarchy with no state.from (e.g. after a refresh)', () => {
    const chain = buildBreadcrumbChain('/users/123');
    expect(chain.map((s) => s.pattern)).toEqual(['/users', '/users/:id']);
  });

  it('builds the static hierarchy for a top-level page', () => {
    const chain = buildBreadcrumbChain('/users');
    expect(chain.map((s) => s.pattern)).toEqual(['/users']);
  });

  it('returns nothing for an unmapped route', () => {
    expect(buildBreadcrumbChain('/403')).toEqual([]);
  });

  it('splices in state.from when it differs from the configured parent', () => {
    const chain = buildBreadcrumbChain('/users/123', '/');
    expect(chain.map((s) => s.pattern)).toEqual(['/', '/users', '/users/:id']);
  });

  it('does not duplicate the segment when state.from equals the configured parent', () => {
    const chain = buildBreadcrumbChain('/users/123', '/users');
    expect(chain.map((s) => s.pattern)).toEqual(['/users', '/users/:id']);
  });

  it('falls back to the static hierarchy when state.from is unmapped', () => {
    const chain = buildBreadcrumbChain('/users/123', '/some/unknown/page');
    expect(chain.map((s) => s.pattern)).toEqual(['/users', '/users/:id']);
  });

  it('carries the dynamic segment params on the leaf', () => {
    const chain = buildBreadcrumbChain('/users/123');
    expect(chain[chain.length - 1].params).toEqual({ id: '123' });
  });
});

describe('filterAccessible', () => {
  it('marks a segment accessible when the user has the required permission', () => {
    const chain = buildBreadcrumbChain('/users/123');
    const result = filterAccessible(chain, [Permissions.Users.View]);
    expect(result.find((s) => s.pattern === '/users')?.accessible).toBe(true);
  });

  it('marks a segment inaccessible without the required permission, so it renders as plain text not a link', () => {
    const chain = buildBreadcrumbChain('/users/123');
    const result = filterAccessible(chain, []);
    expect(result.find((s) => s.pattern === '/users')?.accessible).toBe(false);
  });
});
