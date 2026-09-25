import type { CustomerChatListItem } from '~/types/customerChats';

/** A fan's display name: their name, else @username, else the given fallback. */
export function contactTitle(
  chat: Pick<CustomerChatListItem, 'contactName' | 'contactUsername'>,
  fallback: string
): string {
  return chat.contactName || (chat.contactUsername ? `@${chat.contactUsername}` : fallback);
}
