import { describe, expect, it } from 'vitest';
import { getAssigneeOptions, getEffectiveHubStatus, getInboxChannelOptions, getInboxMobileView, getRealtimeChannelIds, mergeChannelMembers } from './route';
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

describe('getInboxMobileView', () => {
  it('shows the list when nothing is selected, regardless of the info flag', () => {
    expect(getInboxMobileView({ selectedId: null, infoOpen: false })).toBe('list');
    expect(getInboxMobileView({ selectedId: null, infoOpen: true })).toBe('list');
  });

  it('shows the thread once a conversation is selected', () => {
    expect(getInboxMobileView({ selectedId: 'c1', infoOpen: false })).toBe('thread');
  });

  it('shows info only when a conversation is selected and info was explicitly opened', () => {
    expect(getInboxMobileView({ selectedId: 'c1', infoOpen: true })).toBe('info');
  });
});

describe('mergeChannelMembers', () => {
  it('unions members from every channel', () => {
    const result = mergeChannelMembers([
      [{ userId: 'u1', fullName: 'Далер' }],
      [{ userId: 'u2', fullName: 'Нигина' }],
    ]);
    expect(result).toEqual([
      { userId: 'u1', fullName: 'Далер' },
      { userId: 'u2', fullName: 'Нигина' },
    ]);
  });

  it('dedupes a staff member who is on more than one channel', () => {
    const result = mergeChannelMembers([
      [{ userId: 'u1', fullName: 'Далер' }],
      [{ userId: 'u1', fullName: 'Далер' }, { userId: 'u2', fullName: 'Нигина' }],
    ]);
    expect(result).toHaveLength(2);
  });

  it('returns an empty list when no channel has loaded any members yet', () => {
    expect(mergeChannelMembers([])).toEqual([]);
    expect(mergeChannelMembers([[], []])).toEqual([]);
  });
});

describe('getAssigneeOptions', () => {
  const conversationUsers = [{ userId: 'c1', fullName: 'Conversation-scoped' }];
  const filterChannelUsers = [{ userId: 'f1', fullName: 'Filter-channel-scoped' }];
  const allChannelsMembers = [[{ userId: 'a1', fullName: 'Channel A' }], [{ userId: 'a2', fullName: 'Channel B' }]];

  it('uses the open conversation, ignoring the channel filter, when a conversation is selected', () => {
    const result = getAssigneeOptions({
      selectedId: 'conv1',
      conversationAssignableUsers: conversationUsers,
      filterChannelId: 'some-channel',
      filterChannelMembers: filterChannelUsers,
      allChannelsMembers,
    });
    expect(result).toBe(conversationUsers);
  });

  it('uses the filtered channel when no conversation is open but a channel filter is set', () => {
    const result = getAssigneeOptions({
      selectedId: null,
      conversationAssignableUsers: undefined,
      filterChannelId: 'some-channel',
      filterChannelMembers: filterChannelUsers,
      allChannelsMembers,
    });
    expect(result).toBe(filterChannelUsers);
  });

  it('unions every accessible channel when neither a conversation nor a channel filter is set ("Все каналы")', () => {
    const result = getAssigneeOptions({
      selectedId: null,
      conversationAssignableUsers: undefined,
      filterChannelId: null,
      filterChannelMembers: undefined,
      allChannelsMembers,
    });
    expect(result).toEqual([
      { userId: 'a1', fullName: 'Channel A' },
      { userId: 'a2', fullName: 'Channel B' },
    ]);
  });

  it('returns an empty list while the open conversation or filtered channel data is still loading', () => {
    expect(
      getAssigneeOptions({
        selectedId: 'conv1',
        conversationAssignableUsers: undefined,
        filterChannelId: null,
        filterChannelMembers: undefined,
        allChannelsMembers: [],
      })
    ).toEqual([]);
    expect(
      getAssigneeOptions({
        selectedId: null,
        conversationAssignableUsers: undefined,
        filterChannelId: 'some-channel',
        filterChannelMembers: undefined,
        allChannelsMembers: [],
      })
    ).toEqual([]);
  });
});
