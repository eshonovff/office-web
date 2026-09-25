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
});
