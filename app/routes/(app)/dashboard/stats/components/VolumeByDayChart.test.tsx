import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChartResult, DayVolumePoint } from '~/types/dashboardStats';
import { VolumeByDayChart } from './VolumeByDayChart';

function makeResult(overrides: Partial<ChartResult<DayVolumePoint>> = {}): ChartResult<DayVolumePoint> {
  return {
    data: [
      { date: '2026-08-20', inbound: 5, outbound: 3 },
      { date: '2026-08-21', inbound: 8, outbound: 2 },
    ],
    sampleSize: 7,
    sufficient: true,
    ...overrides,
  };
}

describe('VolumeByDayChart', () => {
  it('renders the chart when sufficient', () => {
    const { container } = render(<VolumeByDayChart result={makeResult({ sufficient: true })} />);

    expect(screen.queryByTestId('insufficient-data')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
  });

  it('shows the insufficient-data message instead of a chart when sufficient is false', () => {
    render(<VolumeByDayChart result={makeResult({ sufficient: false, sampleSize: 3, data: [] })} />);

    expect(screen.getByTestId('insufficient-data')).toBeInTheDocument();
    expect(screen.getByText('stats.insufficientData')).toBeInTheDocument();
  });

  it('always shows the title and description regardless of sufficiency', () => {
    render(<VolumeByDayChart result={makeResult({ sufficient: false })} />);

    expect(screen.getByText('stats.volumeByDay.title')).toBeInTheDocument();
    expect(screen.getByText('stats.volumeByDay.description')).toBeInTheDocument();
  });
});
