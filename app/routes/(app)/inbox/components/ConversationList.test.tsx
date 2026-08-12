import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationsApi } from '~/api/conversations';
import { makeQueryClient } from '~/lib/query-client';
import { useInboxStore } from '../store';
import { useInboxBreakpoint } from '../useInboxBreakpoint';
import { ConversationList } from './ConversationList';

vi.mock('~/api/conversations', () => ({
  conversationsApi: {
    list: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 }),
  },
}));
vi.mock('../useInboxBreakpoint', () => ({ useInboxBreakpoint: vi.fn() }));

const channelOptions = [{ value: 'ch1', label: 'WhatsApp' }];

function renderList() {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ConversationList channelOptions={channelOptions} selectedId={null} draggable={false} onSelect={vi.fn()} />
    </QueryClientProvider>
  );
}

describe('ConversationList filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInboxStore.getState().reset();
    vi.mocked(conversationsApi.list).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 });
  });

  it('shows both selects inline at the tablet/desktop tier', () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('desktop');
    renderList();

    expect(screen.getByPlaceholderText('allChannels')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('allStatuses')).toBeInTheDocument();
    expect(screen.queryByText('filters')).not.toBeInTheDocument();
  });

  it('collapses both selects behind a single filter button on mobile', () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('mobile');
    renderList();

    expect(screen.getByText('filters')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('allChannels')).not.toBeInTheDocument();
  });

  it('opens the filter sheet with both selects on tap, on mobile', async () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('mobile');
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByText('filters'));

    expect(screen.getByPlaceholderText('allChannels')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('allStatuses')).toBeInTheDocument();
  });

  it('shows a count badge on the filter button once a filter is active', () => {
    vi.mocked(useInboxBreakpoint).mockReturnValue('mobile');
    useInboxStore.getState().setStatus('New');
    renderList();

    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
