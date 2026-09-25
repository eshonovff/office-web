import type { CustomerContactListItem } from '~/types/customerContacts';

/** A contact's display name: their name, else @username, else the given fallback. */
export function contactName(contact: Pick<CustomerContactListItem, 'name' | 'username'>, fallback: string): string {
  return contact.name || (contact.username ? `@${contact.username}` : fallback);
}

/** Saves a downloaded file under the given name (the browser's usual download). */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
