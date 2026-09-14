import { AlertTriangle, CalendarX, CheckCircle2, Clock, Radio, UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { formatWindowRemaining } from '~/lib/format';
import type { ActionRequiredDto } from '~/types/dashboard';
import { translateFailureCode } from '../../failureCode';

interface ActionRequiredSectionProps {
  data: ActionRequiredDto;
}

export function ActionRequiredSection({ data }: ActionRequiredSectionProps) {
  const { t } = useTranslation('dashboard');

  const total =
    data.closingWindows.count + data.unassigned + data.failedMessages.count + data.channelIssues.count + data.overdueTasks.count;

  if (total === 0) {
    return (
      <section className="min-w-0 space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">{t('actionRequired.title')}</h2>
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border py-12 text-center">
          <CheckCircle2 className="text-success h-8 w-8" />
          <p className="font-medium">{t('actionRequired.allClearTitle')}</p>
          <p className="text-muted-foreground text-sm">{t('actionRequired.allClearBody')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-muted-foreground text-sm font-medium">{t('actionRequired.title')}</h2>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.closingWindows.count > 0 && (
          <Card size="sm" className="min-w-0 border-warning/30">
            <CardHeader>
              <CardTitle className="flex min-w-0 items-center gap-2">
                <Clock className="text-warning h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t('actionRequired.closingWindows.title')}</span>
                <Badge variant="outline">{data.closingWindows.count}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.closingWindows.items.map((item) => (
                <Link
                  key={item.conversationId}
                  to={`/inbox?conversation=${item.conversationId}`}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent">
                  <span className="min-w-0 flex-1 truncate">{item.contactLabel}</span>
                  <span className="text-muted-foreground shrink-0 text-2xs">{formatWindowRemaining(item.windowExpiresAt)}</span>
                </Link>
              ))}
              <MoreCount total={data.closingWindows.count} shown={data.closingWindows.items.length} t={t} />
            </CardContent>
          </Card>
        )}

        {data.unassigned > 0 && (
          <Link to="/inbox?status=New&assignee=unassigned" className="block min-w-0">
            <Card size="sm" className="min-w-0 border-warning/30 transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle className="flex min-w-0 items-center gap-2">
                  <UserX className="text-warning h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t('actionRequired.unassigned.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-semibold tabular-nums">{data.unassigned}</span>
              </CardContent>
            </Card>
          </Link>
        )}

        {data.failedMessages.count > 0 && (
          <Link to="/inbox" className="block min-w-0">
            <Card size="sm" className="min-w-0 border-destructive/30 transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle className="flex min-w-0 items-center gap-2">
                  <AlertTriangle className="text-destructive h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t('actionRequired.failedMessages.title')}</span>
                  <Badge variant="outline">{data.failedMessages.count}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {data.failedMessages.groups.map((group) => (
                  <p key={group.failureCode ?? 'null'} className="min-w-0 text-sm [overflow-wrap:anywhere]">
                    <span className="tabular-nums">{group.count} ×</span> {translateFailureCode(t, group.failureCode)}
                  </p>
                ))}
              </CardContent>
            </Card>
          </Link>
        )}

        {data.channelIssues.count > 0 && (
          <Card size="sm" className="min-w-0 border-destructive/30">
            <CardHeader>
              <CardTitle className="flex min-w-0 items-center gap-2">
                <Radio className="text-destructive h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t('actionRequired.channelIssues.title')}</span>
                <Badge variant="outline">{data.channelIssues.count}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.channelIssues.items.map((item) => (
                <Link
                  key={item.channelId}
                  to={`/channels?channel=${item.channelId}`}
                  className="block min-w-0 rounded-md px-1.5 py-1 hover:bg-accent">
                  <p className="min-w-0 truncate text-sm font-medium">{item.channelName}</p>
                  <p className="text-muted-foreground min-w-0 text-2xs [overflow-wrap:anywhere]">{item.reason}</p>
                </Link>
              ))}
              <MoreCount total={data.channelIssues.count} shown={data.channelIssues.items.length} t={t} />
            </CardContent>
          </Card>
        )}

        {data.overdueTasks.count > 0 && (
          <Card size="sm" className="min-w-0 border-destructive/30">
            <CardHeader>
              <CardTitle className="flex min-w-0 items-center gap-2">
                <CalendarX className="text-destructive h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t('actionRequired.overdueTasks.title')}</span>
                <Badge variant="outline">{data.overdueTasks.count}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.overdueTasks.items.map((item) => (
                <Link
                  key={item.id}
                  to={`/projects/${item.projectId}?task=${item.id}`}
                  className="block min-w-0 rounded-md px-1.5 py-1 hover:bg-accent">
                  <p className="min-w-0 truncate text-sm">{item.title}</p>
                  <p className="text-muted-foreground min-w-0 truncate text-2xs">{item.projectName}</p>
                </Link>
              ))}
              <MoreCount total={data.overdueTasks.count} shown={data.overdueTasks.items.length} t={t} />
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function MoreCount({ total, shown, t }: { total: number; shown: number; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const remaining = total - shown;
  if (remaining <= 0) return null;
  return <p className="text-muted-foreground px-1.5 text-2xs">{t('actionRequired.moreCount', { count: remaining })}</p>;
}
