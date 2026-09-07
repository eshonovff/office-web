import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChartResult, FailedMessageGroup } from '~/types/dashboardStats';
import { FailureBreakdownChart } from './FailureBreakdownChart';

function makeResult(overrides: Partial<ChartResult<FailedMessageGroup>> = {}): ChartResult<FailedMessageGroup> {
  return {
    data: [
      { failureCode: 'IG_2', count: 14 },
      { failureCode: 'IG_1', count: 1 },
    ],
    sampleSize: 20,
    sufficient: true,
    ...overrides,
  };
}

describe('FailureBreakdownChart', () => {
  it('renders the chart and a translated reason per group when sufficient', () => {
    const { container } = render(<FailureBreakdownChart result={makeResult()} />);

    expect(screen.queryByTestId('insufficient-data')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
    // A known exact code goes through translateFailureCode -> a key (fallback i18next returns
    // the key itself); an unrecognized one (IG_1) falls back to the "unknown provider" text —
    // confirms this chart never shows a bare/raw failureCode as its only label.
    expect(screen.getByText('failureCode.exact.IG_2')).toBeInTheDocument();
    expect(screen.getByText(/IG_1/)).toBeInTheDocument();
  });

  it('shows the insufficient-data message when sufficient is false', () => {
    render(<FailureBreakdownChart result={makeResult({ sufficient: false, data: [], sampleSize: 2 })} />);

    expect(screen.getByTestId('insufficient-data')).toBeInTheDocument();
  });

  it('translates a null failureCode to the "unknown" text, not a blank row', () => {
    render(<FailureBreakdownChart result={makeResult({ data: [{ failureCode: null, count: 3 }] })} />);

    expect(screen.getAllByText('failureCode.none').length).toBeGreaterThan(0);
  });
});
