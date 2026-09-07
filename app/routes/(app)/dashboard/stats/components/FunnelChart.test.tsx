import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChartResult, FunnelStage } from '~/types/dashboardStats';
import { FunnelChart } from './FunnelChart';

function makeResult(overrides: Partial<ChartResult<FunnelStage>> = {}): ChartResult<FunnelStage> {
  return {
    data: [
      { stage: 'Омад', count: 42 },
      { stage: 'Ҷавоб гирифт', count: 14 },
      { stage: 'Баста шуд', count: 0 },
    ],
    sampleSize: 42,
    sufficient: true,
    ...overrides,
  };
}

describe('FunnelChart', () => {
  it('renders three stepped bars with translated stage names when sufficient', () => {
    render(<FunnelChart result={makeResult()} />);

    expect(screen.queryByTestId('insufficient-data')).not.toBeInTheDocument();
    // fallback i18next returns the key for a recognized stage — confirms translateFunnelStage
    // ran, rather than the raw Tajik backend string leaking straight through untranslated.
    expect(screen.getByText('stats.funnel.stageArrived')).toBeInTheDocument();
    expect(screen.getByText('stats.funnel.stageResponded')).toBeInTheDocument();
    expect(screen.getByText('stats.funnel.stageClosed')).toBeInTheDocument();
  });

  it('shows the insufficient-data message when sufficient is false', () => {
    render(<FunnelChart result={makeResult({ sufficient: false, data: [], sampleSize: 3 })} />);

    expect(screen.getByTestId('insufficient-data')).toBeInTheDocument();
    expect(screen.queryByText('stats.funnel.stageArrived')).not.toBeInTheDocument();
  });

  it('falls back to the raw stage string for one the backend never documented', () => {
    render(<FunnelChart result={makeResult({ data: [{ stage: 'Нав', count: 5 }] })} />);

    expect(screen.getByText('Нав')).toBeInTheDocument();
  });
});
