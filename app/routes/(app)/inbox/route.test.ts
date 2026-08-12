import { describe, expect, it } from 'vitest';
import { getEffectiveHubStatus, getInboxChannelOptions, getRealtimeChannelIds } from './route';
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

describe('getEffectiveHubStatus', () => {
  const base = { channelsFailed: false, channelsLoading: false, hubError: null, hubStatus: 'connected' as const };

  it('does not claim connected while the channel list is still loading', () => {
    expect(getEffectiveHubStatus({ ...base, channelsLoading: true })).toBe('connecting');
  });

  it('shows disconnected when the channel list failed to load, even if the hub itself is connected', () => {
    expect(getEffectiveHubStatus({ ...base, channelsFailed: true })).toBe('disconnected');
  });

  it('channel-list failure takes priority over a merely-loading state', () => {
    expect(getEffectiveHubStatus({ ...base, channelsFailed: true, channelsLoading: true })).toBe('disconnected');
  });

  it('shows disconnected when a channel join failed even though channels loaded fine', () => {
    expect(getEffectiveHubStatus({ ...base, hubError: 'joinChannelFailed' })).toBe('disconnected');
  });

  it('passes through the raw hub status once channels have loaded and nothing failed', () => {
    expect(getEffectiveHubStatus({ ...base, hubStatus: 'reconnecting' })).toBe('reconnecting');
  });
});
