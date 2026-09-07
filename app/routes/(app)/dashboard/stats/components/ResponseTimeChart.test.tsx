import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChartResult, ResponseTimeBucket } from '~/types/dashboardStats';
import { ResponseTimeChart } from './ResponseTimeChart';

function makeResult(overrides: Partial<ChartResult<ResponseTimeBucket> & { unanswered: number }> = {}): ChartResult<ResponseTimeBucket> & {
  unanswered: number;
} {
  return {
    data: [
      { bucket: '<5min', count: 5 },
      { bucket: '5-15min', count: 2 },
    ],
    unanswered: 3,
    sampleSize: 20,
    sufficient: true,
    ...overrides,
  };
}

describe('ResponseTimeChart', () => {
  it('renders the chart and the unanswered note when sufficient', () => {
    const { container } = render(<ResponseTimeChart result={makeResult()} />);

    expect(screen.queryByTestId('insufficient-data')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
    expect(screen.getByText('stats.responseTimeBuckets.unanswered')).toBeInTheDocument();
  });

  it('hides the unanswered note when there are none', () => {
    render(<ResponseTimeChart result={makeResult({ unanswered: 0 })} />);

    expect(screen.queryByText('stats.responseTimeBuckets.unanswered')).not.toBeInTheDocument();
  });

  it('shows the insufficient-data message for the live example (14 responded, 20 required)', () => {
    render(<ResponseTimeChart result={makeResult({ sufficient: false, sampleSize: 14, unanswered: 28 })} />);

    expect(screen.getByTestId('insufficient-data')).toBeInTheDocument();
    // The unanswered note is only meaningful alongside the chart itself — insufficient hides both.
    expect(screen.queryByText('stats.responseTimeBuckets.unanswered')).not.toBeInTheDocument();
  });
});
