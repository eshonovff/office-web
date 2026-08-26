import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from '~/api/notifications';
import { tasksApi } from '~/api/tasks';
import { makeQueryClient } from '~/lib/query-client';
import type { NotificationDto } from '~/types/notification';
import { NotificationBell } from './NotificationBell';

const navigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('~/api/notifications', () => ({
  notificationsApi: { list: vi.fn(), markRead: vi.fn() },
}));

vi.mock('~/api/tasks', () => ({
  tasksApi: { get: vi.fn() },
}));

vi.mock('~/hooks/useNotificationsRealtime', () => ({
  useNotificationsRealtime: vi.fn(),
}));

function makeNotification(overrides: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id: 'n1',
    type: 'task_assigned',
    payloadJson: JSON.stringify({ taskId: 'task-1', title: 'Write the report' }),
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderBell() {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationBell />
    </QueryClientProvider>
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the unread count badge and hides it once nothing is unread', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue([
      makeNotification({ id: 'n1', isRead: false }),
      makeNotification({ id: 'n2', isRead: true }),
    ]);
    renderBell();

    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('marks a notification as read and navigates to its task when clicked', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue([makeNotification()]);
    vi.mocked(notificationsApi.markRead).mockResolvedValue(undefined);
    vi.mocked(tasksApi.get).mockResolvedValue({ id: 'task-1', projectId: 'project-1' } as never);
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getAllByRole('button')[0]);
    const item = await screen.findByText('messages.taskAssigned');
    await user.click(item);

    await waitFor(() => expect(notificationsApi.markRead).toHaveBeenCalledWith({ notificationIds: ['n1'] }));
    await waitFor(() => expect(tasksApi.get).toHaveBeenCalledWith('task-1'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/projects/project-1?task=task-1'));
  });

  it('navigates to /channels for a whatsapp_error notification without fetching a task', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue([
      makeNotification({ id: 'n1', type: 'whatsapp_error', payloadJson: JSON.stringify({ message: 'bad token' }) }),
    ]);
    vi.mocked(notificationsApi.markRead).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getAllByRole('button')[0]);
    const item = await screen.findByText('bad token');
    await user.click(item);

    expect(tasksApi.get).not.toHaveBeenCalled();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/channels'));
  });

  it('marks every notification as read via "mark all read"', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue([
      makeNotification({ id: 'n1', isRead: false }),
      makeNotification({ id: 'n2', isRead: false }),
    ]);
    vi.mocked(notificationsApi.markRead).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getAllByRole('button')[0]);
    const markAllButton = await screen.findByText('markAllRead');
    await user.click(markAllButton);

    await waitFor(() => expect(notificationsApi.markRead).toHaveBeenCalledWith(undefined));
  });

  it('shows the empty state when there are no notifications', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getAllByRole('button')[0]);
    expect(await within(document.body).findByText('empty')).toBeInTheDocument();
  });
});
