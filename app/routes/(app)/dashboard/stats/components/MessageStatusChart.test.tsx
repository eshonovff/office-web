import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChartResult, MessageStatusPoint } from '~/types/dashboardStats';
import { MessageStatusChart } from './MessageStatusChart';

function makeResult(overrides: Partial<ChartResult<MessageStatusPoint>> = {}): ChartResult<MessageStatusPoint> {
  return {
    data: [
      { status: 'Read', count: 307 },
      { status: 'Failed', count: 20 },
    ],
    sampleSize: 374,
    sufficient: true,
    ...overrides,
  };
}

describe('MessageStatusChart', () => {
  it('renders the chart and translates each status label when sufficient', () => {
    const { container } = render(<MessageStatusChart result={makeResult()} />);

    expect(screen.queryByTestId('insufficient-data')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows the insufficient-data message when sufficient is false', () => {
    render(<MessageStatusChart result={makeResult({ sufficient: false, data: [], sampleSize: 5 })} />);

    expect(screen.getByTestId('insufficient-data')).toBeInTheDocument();
  });
});
