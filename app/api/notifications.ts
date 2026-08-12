import { apiClient } from '~/lib/client';
import type { MarkNotificationsReadRequest, NotificationDto } from '~/types/notification';

export const notificationsApi = {
  list: async (): Promise<NotificationDto[]> => {
    const { data } = await apiClient.get<NotificationDto[]>('/notifications');
    return data;
  },
  // No notificationIds (or an empty list) marks every unread notification as read.
  markRead: async (payload?: MarkNotificationsReadRequest): Promise<void> => {
    await apiClient.post('/notifications/read', payload);
  },
};
