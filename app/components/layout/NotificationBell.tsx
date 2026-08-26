import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { notificationsApi } from "~/api/notifications";
import { tasksApi } from "~/api/tasks";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useNotificationsRealtime } from "~/hooks/useNotificationsRealtime";
import { formatRelativeTime } from "~/lib/format";
import { cn } from "~/lib/utils";
import type {
  DeadlineTomorrowPayload,
  NotificationDto,
  TaskAssignedPayload,
  WhatsAppErrorPayload,
} from "~/types/notification";

function parsePayload<T>(payloadJson: string | null): T | null {
  if (!payloadJson) return null;
  try {
    return JSON.parse(payloadJson) as T;
  } catch {
    return null;
  }
}

export function NotificationBell() {
  const { t } = useTranslation("notifications");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Header (and therefore this component) is mounted for every authenticated
  // page, so this is what makes notifications realtime outside /inbox too —
  // the shared hub connection itself is started once, higher up, by
  // useRealtimeConnection in the app layout.
  useNotificationsRealtime();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    staleTime: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const { mutate: markRead } = useMutation({
    mutationFn: (notificationIds?: string[]) =>
      notificationsApi.markRead(notificationIds ? { notificationIds } : undefined),
    onSuccess: (_data, notificationIds) => {
      queryClient.setQueryData<NotificationDto[]>(["notifications"], (old) =>
        old?.map((n) => (!notificationIds || notificationIds.includes(n.id) ? { ...n, isRead: true } : n))
      );
    },
  });

  async function goToTask(taskId: string) {
    try {
      const task = await tasksApi.get(taskId);
      navigate(`/projects/${task.projectId}?task=${taskId}`);
    } catch {
      // Task was deleted (or is no longer accessible) since the notification
      // was created — nothing left to open.
    }
  }

  function handleOpen(notification: NotificationDto) {
    if (!notification.isRead) markRead([notification.id]);

    switch (notification.type) {
      case "task_assigned":
      case "deadline_tomorrow":
      case "mention": {
        const payload = parsePayload<{ taskId: string }>(notification.payloadJson);
        if (payload) void goToTask(payload.taskId);
        return;
      }
      case "whatsapp_error":
        navigate("/channels");
        return;
    }
  }

  function messageFor(notification: NotificationDto): string {
    switch (notification.type) {
      case "task_assigned": {
        const payload = parsePayload<TaskAssignedPayload>(notification.payloadJson);
        return t("messages.taskAssigned", { title: payload?.title ?? "" });
      }
      case "deadline_tomorrow": {
        const payload = parsePayload<DeadlineTomorrowPayload>(notification.payloadJson);
        return t("messages.deadlineTomorrow", { title: payload?.title ?? "" });
      }
      case "mention":
        return t("messages.mention");
      case "whatsapp_error": {
        const payload = parsePayload<WhatsAppErrorPayload>(notification.payloadJson);
        return payload?.message ?? t("messages.whatsappError");
      }
      default:
        return notification.type;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="relative" />}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full bg-destructive px-1 text-[10px] leading-none text-destructive-foreground dark:bg-destructive">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
        <span className="sr-only">{t("title")}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 overflow-hidden p-0" sideOffset={8}>
        <DropdownMenuGroup className="flex items-center justify-between border-b p-3">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">{t("title")}</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => markRead(undefined)}>
              {t("markAllRead")}
            </Button>
          )}
        </DropdownMenuGroup>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground p-4 text-center text-sm">{t("empty")}</p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleOpen(notification)}
                className="flex cursor-pointer flex-col items-start gap-0.5 rounded-none border-b px-3 py-2.5 last:border-b-0">
                <div className="flex w-full items-center gap-2">
                  {!notification.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  <span className={cn("flex-1 text-sm", notification.isRead ? "text-muted-foreground" : "font-medium")}>
                    {messageFor(notification)}
                  </span>
                </div>
                <span className="text-muted-foreground text-2xs">{formatRelativeTime(notification.createdAt)}</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
