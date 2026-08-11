import { describe, expect, it } from 'vitest';
import { getInboxChannelOptions, getRealtimeChannelIds } from './route';
import type { MyChannelListItem } from '~/types/channel';

const channels: MyChannelListItem[] = [
  { id: 'joinable', type: 'WhatsApp', name: 'WhatsApp', isActive: true, joinable: true },
  { id: 'filter-only', type: 'Instagram', name: 'Instagram', isActive: true, joinable: false },
  { id: 'legacy-active', type: 'Facebook', name: 'Facebook', isActive: true },
  { id: 'inactive', type: 'WhatsApp', name: 'Old WhatsApp', isActive: false, joinable: true },
];

describe('inbox channel helpers', () => {
  it('shows every channel returned by /channels/mine in the filter dropdown', () => {
    expect(getInboxChannelOptions(channels)).toEqual([
      { value: 'joinable', label: 'WhatsApp' },
      { value: 'filter-only', label: 'Instagram' },
      { value: 'legacy-active', label: 'Facebook' },
      { value: 'inactive', label: 'Old WhatsApp' },
    ]);
  });

  it('joins only active joinable channels, defaulting missing joinable to true', () => {
    expect(getRealtimeChannelIds(channels)).toEqual(['joinable', 'legacy-active']);
  });
});
