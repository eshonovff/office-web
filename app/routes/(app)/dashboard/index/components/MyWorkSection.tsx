import { CalendarClock, CalendarX, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import type { MyWorkDto, TaskGroupSummary } from '~/types/dashboard';

interface MyWorkSectionProps {
  data: MyWorkDto;
}

export function MyWorkSection({ data }: MyWorkSectionProps) {
  const { t } = useTranslation(['dashboard', 'inbox']);

  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-muted-foreground text-sm font-medium">{t('myWork.title')}</h2>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle className="flex min-w-0 items-center gap-2">
              <MessageCircle className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{t('myWork.conversationsTitle')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.myConversations.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('myWork.noConversations')}</p>
            ) : (
              data.myConversations.map((group) => (
                <Link
                  key={group.status}
                  to={`/inbox?status=${group.status}&assignee=me`}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent">
                  <span className="min-w-0 flex-1 truncate">{t(`status.${group.status}`, { ns: 'inbox' })}</span>
                  <Badge variant="outline">{group.count}</Badge>
                </Link>
              ))
            )}
            {data.myUnread > 0 && (
              <Link to="/inbox?assignee=me" className="text-muted-foreground block px-1.5 text-2xs hover:underline">
                {t('myWork.unreadCount', { count: data.myUnread })}
              </Link>
            )}
          </CardContent>
        </Card>

        <TaskGroupCard
          icon={CalendarClock}
          title={t('myWork.tasksTodayTitle')}
          emptyText={t('myWork.noTasksToday')}
          summary={data.myTasksToday}
        />

        <TaskGroupCard
          icon={CalendarX}
          title={t('myWork.tasksOverdueTitle')}
          emptyText={t('myWork.noTasksOverdue')}
          summary={data.myTasksOverdue}
        />
      </div>
    </section>
  );
}

function TaskGroupCard({
  icon: Icon,
  title,
  emptyText,
  summary,
}: {
  icon: typeof CalendarClock;
  title: string;
  emptyText: string;
  summary: TaskGroupSummary;
}) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {summary.count > 0 && <Badge variant="outline">{summary.count}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {summary.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyText}</p>
        ) : (
          summary.items.map((item) => (
            <Link
              key={item.id}
              to={`/projects/${item.projectId}?task=${item.id}`}
              className="block min-w-0 rounded-md px-1.5 py-1 hover:bg-accent">
              <p className="min-w-0 truncate text-sm">{item.title}</p>
              <p className="text-muted-foreground min-w-0 truncate text-2xs">{item.projectName}</p>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
