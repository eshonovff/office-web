export type NotificationType = 'task_assigned' | 'deadline_tomorrow' | 'mention' | 'whatsapp_error';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  payloadJson: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MarkNotificationsReadRequest {
  notificationIds?: string[];
}

export interface TaskAssignedPayload {
  taskId: string;
  title: string;
}

export interface DeadlineTomorrowPayload {
  taskId: string;
  title: string;
}

export interface MentionPayload {
  taskId: string;
  commentId: string;
}

export interface WhatsAppErrorPayload {
  message: string;
}
