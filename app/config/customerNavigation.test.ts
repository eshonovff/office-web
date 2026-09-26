import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { getCustomerSidebarConfig } from '~/config/customerNavigation';

const t = ((key: string) => key) as unknown as TFunction;

describe('мизоҷ sidebar', () => {
  it('opens Chats, with its unread badge', () => {
    const chats = getCustomerSidebarConfig(t).find((item) => item.title === 'sidebar.chats');
    expect(chats?.url).toBe('/account/chats');
    expect(chats?.disabled).toBeFalsy();
    expect(chats?.badgeKey).toBe('unreadChats');
  });

  it('opens Comments, with its new-comments badge', () => {
    const comments = getCustomerSidebarConfig(t).find((item) => item.title === 'sidebar.comments');
    expect(comments?.url).toBe('/account/comments');
    expect(comments?.disabled).toBeFalsy();
    expect(comments?.badgeKey).toBe('newComments');
  });

  it('opens Contacts', () => {
    const contacts = getCustomerSidebarConfig(t).find((item) => item.title === 'sidebar.contacts');
    expect(contacts?.url).toBe('/account/contacts');
    expect(contacts?.disabled).toBeFalsy();
  });

  it('opens Analytics', () => {
    const analytics = getCustomerSidebarConfig(t).find((item) => item.title === 'sidebar.analytics');
    expect(analytics?.url).toBe('/account/analytics');
    expect(analytics?.disabled).toBeFalsy();
  });
});
