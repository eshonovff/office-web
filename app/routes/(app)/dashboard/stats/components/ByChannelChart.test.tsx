import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChannelVolumePoint, ChartResult } from '~/types/dashboardStats';
import { ByChannelChart } from './ByChannelChart';

function makeResult(overrides: Partial<ChartResult<ChannelVolumePoint>> = {}): ChartResult<ChannelVolumePoint> {
  return {
    data: [{ channelId: 'ch1', channelName: 'WhatsApp Test', channelType: 'WhatsApp', activeConversations: 12 }],
    sampleSize: 12,
    sufficient: true,
    ...overrides,
  };
}

describe('ByChannelChart', () => {
  it('renders the chart and a legend row per channel when sufficient', () => {
    const { container } = render(<ByChannelChart result={makeResult()} />);

    expect(screen.queryByTestId('insufficient-data')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp Test')).toBeInTheDocument();
  });

  it('shows the insufficient-data message when sufficient is false, not a misleading empty pie', () => {
    render(<ByChannelChart result={makeResult({ sufficient: false, data: [], sampleSize: 2 })} />);

    expect(screen.getByTestId('insufficient-data')).toBeInTheDocument();
    expect(screen.queryByText('WhatsApp Test')).not.toBeInTheDocument();
  });
});
