import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChartResult, OperatorLoadPoint } from '~/types/dashboardStats';
import { OperatorLoadChart } from './OperatorLoadChart';

function makeResult(overrides: Partial<ChartResult<OperatorLoadPoint>> = {}): ChartResult<OperatorLoadPoint> {
  return {
    data: [{ userId: 'u1', userName: 'Далер', openConversations: 4 }],
    sampleSize: 4,
    sufficient: true,
    ...overrides,
  };
}

describe('OperatorLoadChart', () => {
  it('renders the chart when sufficient (this is the live sufficient=false example from the real API — flip it here)', () => {
    const { container } = render(<OperatorLoadChart result={makeResult()} />);

    expect(screen.queryByTestId('insufficient-data')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
  });

  it('shows the insufficient-data message for an empty operatorLoad — the exact live shape seen when nobody has an open conversation yet', () => {
    render(<OperatorLoadChart result={makeResult({ sufficient: false, data: [], sampleSize: 0 })} />);

    expect(screen.getByTestId('insufficient-data')).toBeInTheDocument();
  });
});
