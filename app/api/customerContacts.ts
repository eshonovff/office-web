import type { PagedResult } from '~/types/conversation';
import { customerApiClient } from '~/lib/customerClient';
import type {
  ContactTagCount,
  ContactsFilter,
  CustomerContactDetail,
  CustomerContactListItem,
} from '~/types/customerContacts';

const PAGE_SIZE = 30;

/** Only the filters that are set — an empty search is no search. */
function params(filter: ContactsFilter) {
  return {
    channelId: filter.channelId || undefined,
    search: filter.search?.trim() || undefined,
    tag: filter.tag || undefined,
  };
}

export const customerContactsApi = {
  list: async (filter: ContactsFilter, page: number): Promise<PagedResult<CustomerContactListItem>> => {
    const { data } = await customerApiClient.get<PagedResult<CustomerContactListItem>>('/contacts', {
      params: { ...params(filter), page, pageSize: PAGE_SIZE },
    });
    return data;
  },
  tags: async (channelId?: string): Promise<ContactTagCount[]> => {
    const { data } = await customerApiClient.get<ContactTagCount[]>('/contacts/tags', {
      params: { channelId: channelId || undefined },
    });
    return data;
  },
  get: async (id: string): Promise<CustomerContactDetail> => {
    const { data } = await customerApiClient.get<CustomerContactDetail>(`/contacts/${id}`);
    return data;
  },
  addTag: async (id: string, tag: string): Promise<void> => {
    await customerApiClient.post(`/contacts/${id}/tags`, { tag });
  },
  removeTag: async (id: string, tag: string): Promise<void> => {
    await customerApiClient.delete(`/contacts/${id}/tags`, { params: { tag } });
  },
  setVariable: async (id: string, key: string, value: string): Promise<void> => {
    await customerApiClient.put(`/contacts/${id}/variables`, { key, value });
  },
  removeVariable: async (id: string, key: string): Promise<void> => {
    await customerApiClient.delete(`/contacts/${id}/variables`, { params: { key } });
  },
  remove: async (id: string): Promise<void> => {
    await customerApiClient.delete(`/contacts/${id}`);
  },
  export: async (filter: ContactsFilter, lang: string): Promise<Blob> => {
    const { data } = await customerApiClient.get<Blob>('/contacts/export', {
      params: { ...params(filter), lang },
      responseType: 'blob',
    });
    return data;
  },
};

/** One root: any change refreshes the list, the tag counts and the open card together. */
export const customerContactKeys = {
  all: ['customer-contacts'] as const,
  list: (filter: ContactsFilter) => ['customer-contacts', 'list', filter] as const,
  tags: (channelId?: string) => ['customer-contacts', 'tags', channelId ?? 'all'] as const,
  detail: (id: string) => ['customer-contacts', 'detail', id] as const,
};
