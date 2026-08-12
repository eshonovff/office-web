import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { channelsApi } from '~/api/channels';
import { makeQueryClient } from '~/lib/query-client';
import type { ChannelListItem } from '~/types/channel';
import ChannelsPage from './route';

vi.mock('~/api/channels', () => ({
  channelsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
  },
}));

function makeChannel(overrides: Partial<ChannelListItem> = {}): ChannelListItem {
  return {
    id: 'ch1',
    type: 'WhatsApp',
    name: 'WhatsApp Test',
    externalId: '1206432455895142',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderPage() {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ChannelsPage />
    </QueryClientProvider>
  );
}

describe('ChannelsPage deactivate flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only shows the deactivate button for active channels', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([
      makeChannel({ id: 'active', isActive: true }),
      makeChannel({ id: 'inactive', isActive: false }),
    ]);
    renderPage();

    await waitFor(() => expect(screen.getAllByText('deactivate')).toHaveLength(1));
  });

  it('asks for confirmation before calling deactivate', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('deactivate'));
    await user.click(screen.getByText('deactivate'));

    expect(screen.getByText('deactivateChannelTitle')).toBeInTheDocument();
    expect(channelsApi.deactivate).not.toHaveBeenCalled();
  });

  it('calls deactivate only after the confirmation is accepted', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([makeChannel()]);
    vi.mocked(channelsApi.deactivate).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('deactivate'));
    await user.click(screen.getByText('deactivate'));
    // Confirm dialog re-uses the same "deactivate" label for its confirm button.
    const confirmButtons = screen.getAllByText('deactivate');
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(channelsApi.deactivate).toHaveBeenCalledWith('ch1'));
  });
});
