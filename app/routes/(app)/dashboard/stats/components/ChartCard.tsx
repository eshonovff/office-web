import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

interface ChartCardProps {
  title: string;
  description: string;
  sampleSize: number;
  sufficient: boolean;
  requiredSampleSize: number;
  /** Already-translated unit noun, e.g. "мукотиба" — see stats.units.* in dashboard.json. */
  unit: string;
  children: React.ReactNode;
}

/**
 * Shared by all 8 charts (block 2 of the stats build) — sufficient=false never renders the chart
 * itself, only this calm "not enough data yet" message with the real numbers. A curve fit to a
 * handful of points looks exactly as confident as one fit to thousands; showing it anyway is the
 * one thing this page must never do.
 */
export function ChartCard({ title, description, sampleSize, sufficient, requiredSampleSize, unit, children }: ChartCardProps) {
  const { t } = useTranslation('dashboard');

  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle className="min-w-0 truncate">{title}</CardTitle>
        <CardDescription className="min-w-0 [overflow-wrap:anywhere]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {sufficient ? (
          children
        ) : (
          <div className="flex min-h-32 items-center justify-center text-center" data-testid="insufficient-data">
            <p className="text-muted-foreground min-w-0 text-sm [overflow-wrap:anywhere]">
              {t('stats.insufficientData', { sampleSize, unit, required: requiredSampleSize })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
