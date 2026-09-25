import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commentAutomationApi } from '~/api/commentAutomation';
import { makeQueryClient } from '~/lib/query-client';
import { DryRunPanel } from './DryRunPanel';

vi.mock('~/api/commentAutomation', () => ({
  commentAutomationApi: { dryRun: vi.fn() },
}));

function renderPanel(props: Partial<React.ComponentProps<typeof DryRunPanel>> = {}, { expanded = true } = {}) {
  const queryClient = makeQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <DryRunPanel
        channelId="ig1"
        matchMode="keyword"
        keywords={['нарх']}
        postScope="all"
        postIds={[]}
        requiresFollow={false}
        {...props}
      />
    </QueryClientProvider>
  );
  // The panel starts closed; the checks below are about it once opened.
  if (expanded) fireEvent.click(screen.getByRole('button', { name: 'dryRun.title' }));
  return result;
}

describe('DryRunPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts closed — only its title, until opened', async () => {
    const user = userEvent.setup();
    renderPanel({}, { expanded: false });

    const toggle = screen.getByRole('button', { name: 'dryRun.title' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByPlaceholderText('dryRun.placeholder')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByPlaceholderText('dryRun.placeholder')).toBeInTheDocument();
  });

  it('never calls dryRun before the user runs the check', () => {
    renderPanel();

    expect(commentAutomationApi.dryRun).not.toHaveBeenCalled();
  });

  it('sends the current trigger config and typed comment text on Run', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({
      matched: true,
      matchedKeyword: 'нарх',
      followCheckResult: null,
    });
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByPlaceholderText('dryRun.placeholder'), 'Нархаш чанд?');
    await user.click(screen.getByText('dryRun.run'));

    await waitFor(() =>
      expect(commentAutomationApi.dryRun).toHaveBeenCalledWith('ig1', {
        triggerConfig: { matchMode: 'keyword', keywords: ['нарх'], postScope: 'all', postIds: [] },
        commentText: 'Нархаш чанд?',
        mediaId: null,
        conditionConfig: { requiresFollow: false },
        actorExternalId: null,
      })
    );
  });

  it('shows the matched keyword when the dry run matches', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({
      matched: true,
      matchedKeyword: 'нарх',
      followCheckResult: null,
    });
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByPlaceholderText('dryRun.placeholder'), 'Нархаш чанд?');
    await user.click(screen.getByText('dryRun.run'));

    await waitFor(() => expect(screen.getByText('dryRun.matched')).toBeInTheDocument());
  });

  it('shows the not-matched message when the dry run does not match', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({
      matched: false,
      matchedKeyword: null,
      followCheckResult: null,
    });
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

  it('does not show the actor-id field when requiresFollow is off', () => {
    renderPanel({ requiresFollow: false });

    expect(screen.queryByPlaceholderText('dryRun.actorIdPlaceholder')).not.toBeInTheDocument();
  });

  it('shows the actor-id field when requiresFollow is on and sends it with the request', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({
      matched: true,
      matchedKeyword: 'нарх',
      followCheckResult: 'Following',
    });
    const user = userEvent.setup();
    renderPanel({ requiresFollow: true });

    await user.type(screen.getByPlaceholderText('dryRun.placeholder'), 'Нархаш чанд?');
    await user.type(screen.getByPlaceholderText('dryRun.actorIdPlaceholder'), '123456');
    await user.click(screen.getByText('dryRun.run'));

    await waitFor(() =>
      expect(commentAutomationApi.dryRun).toHaveBeenCalledWith(
        'ig1',
        expect.objectContaining({ conditionConfig: { requiresFollow: true }, actorExternalId: '123456' })
      )
    );
  });

  it('shows which branch fired when a follow-check result comes back', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({
      matched: true,
      matchedKeyword: 'нарх',
      followCheckResult: 'NotFollowing',
    });
    const user = userEvent.setup();
    renderPanel({ requiresFollow: true });

    await user.type(screen.getByPlaceholderText('dryRun.placeholder'), 'Нархаш чанд?');
    await user.type(screen.getByPlaceholderText('dryRun.actorIdPlaceholder'), '123456');
    await user.click(screen.getByText('dryRun.run'));

    await waitFor(() => expect(screen.getByText('dryRun.followResult.NotFollowing')).toBeInTheDocument());
  });

  it('shows the "skipped" note when requiresFollow is on but no actor id was given', async () => {
    vi.mocked(commentAutomationApi.dryRun).mockResolvedValue({
      matched: true,
      matchedKeyword: 'нарх',
      followCheckResult: null,
    });
    const user = userEvent.setup();
    renderPanel({ requiresFollow: true });

    await user.type(screen.getByPlaceholderText('dryRun.placeholder'), 'Нархаш чанд?');
    await user.click(screen.getByText('dryRun.run'));

    await waitFor(() => expect(screen.getByText('dryRun.followResultSkipped')).toBeInTheDocument());
  });
});
