import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commentAutomationApi } from '~/api/commentAutomation';
import { makeQueryClient } from '~/lib/query-client';
import { DryRunPanel } from './DryRunPanel';

vi.mock('~/api/commentAutomation', () => ({
  commentAutomationApi: { dryRun: vi.fn() },
}));

function renderPanel(props: Partial<React.ComponentProps<typeof DryRunPanel>> = {}) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <DryRunPanel channelId="ig1" matchMode="keyword" keywords={['нарх']} postScope="all" postIds={[]} {...props} />
    </QueryClientProvider>
  );
}

describe('DryRunPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never calls dryRun before the user runs the check', () => {
    renderPanel();

    expect(commentAutomationApi.dryRun).not.toHaveBeenCalled();
  });

  it('sends the current trigger config and typed comment text on Run', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({ matched: true, matchedKeyword: 'нарх' });
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByPlaceholderText('dryRun.placeholder'), 'Нархаш чанд?');
    await user.click(screen.getByText('dryRun.run'));

    await waitFor(() =>
      expect(commentAutomationApi.dryRun).toHaveBeenCalledWith('ig1', {
        triggerConfig: { matchMode: 'keyword', keywords: ['нарх'], postScope: 'all', postIds: [] },
        commentText: 'Нархаш чанд?',
        mediaId: null,
      })
    );
  });

  it('shows the matched keyword when the dry run matches', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({ matched: true, matchedKeyword: 'нарх' });
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByPlaceholderText('dryRun.placeholder'), 'Нархаш чанд?');
    await user.click(screen.getByText('dryRun.run'));

    await waitFor(() => expect(screen.getByText('dryRun.matched')).toBeInTheDocument());
  });

  it('shows the not-matched message when the dry run does not match', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({ matched: false, matchedKeyword: null });
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByPlaceholderText('dryRun.placeholder'), '🔥👏');
    await user.click(screen.getByText('dryRun.run'));

    await waitFor(() => expect(screen.getByText('dryRun.notMatched')).toBeInTheDocument());
  });

  it('disables the run button while the comment text is empty', () => {
    renderPanel();

    expect(screen.getByText('dryRun.run')).toBeDisabled();
  });
});
