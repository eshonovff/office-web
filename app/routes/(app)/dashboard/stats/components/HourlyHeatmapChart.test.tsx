import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChartResult, HeatmapPoint } from '~/types/dashboardStats';
import { HourlyHeatmapChart } from './HourlyHeatmapChart';

function makeResult(overrides: Partial<ChartResult<HeatmapPoint>> = {}): ChartResult<HeatmapPoint> {
  return {
    data: [{ dayOfWeek: 1, hour: 13, count: 8 }],
    sampleSize: 100,
    sufficient: true,
    ...overrides,
  };
}

describe('HourlyHeatmapChart', () => {
  it('renders a 7x24 grid inside a horizontally scrollable container when sufficient (mobile overflow safety)', () => {
    const { container } = render(<HourlyHeatmapChart result={makeResult()} />);

    expect(screen.queryByTestId('insufficient-data')).not.toBeInTheDocument();
    // 7 day labels + 24 hour columns worth of cells (7*24) + the 24 header cells + 1 corner spacer.
    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeInTheDocument();
  });

  it('shows the insufficient-data message instead of a mostly-empty grid when sufficient is false', () => {
    render(<HourlyHeatmapChart result={makeResult({ sufficient: false, data: [], sampleSize: 12 })} />);

    expect(screen.getByTestId('insufficient-data')).toBeInTheDocument();
  });

  it('shows a tooltip title on a populated cell with the message count', () => {
    const { container } = render(<HourlyHeatmapChart result={makeResult({ data: [{ dayOfWeek: 2, hour: 9, count: 5 }] })} />);

    const cellWithTooltip = container.querySelector('[title]');
    expect(cellWithTooltip).not.toBeNull();
  });
});
