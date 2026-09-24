import { describe, expect, it } from 'vitest';
import { Permissions } from '~/config/permissions';
import { customerLandingPath, isCustomerIdentifier, signInErrorOf, staffLandingPath } from '~/lib/signIn';

describe('isCustomerIdentifier', () => {
  it('sends emails to the мизоҷ login and usernames to the staff login', () => {
    expect(isCustomerIdentifier('faridun@example.com')).toBe(true);
    expect(isCustomerIdentifier('992927777777')).toBe(false);
    expect(isCustomerIdentifier('owner')).toBe(false);
  });
});

describe('staffLandingPath', () => {
  it('follows redirectTo only to a page the staff member may open', () => {
    expect(staffLandingPath('/users', [Permissions.Users.View])).toBe('/users');
    expect(staffLandingPath('/users', [])).toBe('/dashboard');
    expect(staffLandingPath(null, [Permissions.Users.View])).toBe('/dashboard');
  });

  it('never leaves the app', () => {
    expect(staffLandingPath('//evil.com', [Permissions.Users.View])).toBe('/dashboard');
    expect(staffLandingPath('https://evil.com/users', [Permissions.Users.View])).toBe('/dashboard');
  });
});

describe('customerLandingPath', () => {
  it('follows redirectTo only inside the мизоҷ area', () => {
    expect(customerLandingPath('/account/billing')).toBe('/account/billing');
    expect(customerLandingPath('/account')).toBe('/account');
    expect(customerLandingPath('/account?tab=1')).toBe('/account?tab=1');
    expect(customerLandingPath(null)).toBe('/account');
  });

  it('refuses other origins, staff pages and look-alike paths', () => {
    expect(customerLandingPath('//evil.com')).toBe('/account');
    expect(customerLandingPath('https://evil.com/account')).toBe('/account');
    expect(customerLandingPath('/users')).toBe('/account');
    expect(customerLandingPath('/accounts-evil')).toBe('/account');
    expect(customerLandingPath('/dashboard')).toBe('/account');
  });
});

describe('signInErrorOf', () => {
  const failed = (status?: number) => ({ response: status ? { status } : undefined });

  it('maps a wrong login from either system to the same message', () => {
    expect(signInErrorOf(failed(401))).toBe('invalid');
    expect(signInErrorOf(failed(400))).toBe('invalid');
  });

  it('tells apart unverified, rate-limited and unreachable', () => {
    expect(signInErrorOf(failed(403))).toBe('notVerified');
    expect(signInErrorOf(failed(429))).toBe('tooMany');
    expect(signInErrorOf(failed(500))).toBe('unavailable');
    expect(signInErrorOf(failed())).toBe('unavailable');
  });
});
