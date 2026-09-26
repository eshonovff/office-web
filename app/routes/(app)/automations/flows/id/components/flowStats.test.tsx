import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FlowBuilderApiProvider, staffFlowBuilderApi } from '~/lib/flowBuilderApi';
import type { FlowCanvasNode } from '~/lib/flowGraph';
import { makeQueryClient } from '~/lib/query-client';
import type { ActionNodeConfig, FlowStats, MessageNodeConfig } from '~/types/flow';
import { ActionNodeCard } from './ActionNodeCard';
import { ActionNodePanel } from './ActionNodePanel';
import { clickRate, FlowNodeStatsProvider, toStatsMaps, type FlowStatsMaps } from './flowStatsContext';
import { FlowStatsPopover } from './FlowStatsPopover';
import { MessageNodeCard } from './MessageNodeCard';

vi.mock('~/components/shared/CustomSelect', () => ({
  CustomSelect: (props: {
    options: { value: string; label: string }[];
    value?: string | null;
    onChange: (value: unknown) => void;
  }) => (
    <select aria-label="kind" value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value)}>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

function nodeProps(id: string, config: MessageNodeConfig | ActionNodeConfig, type: 'message' | 'action') {
  return { id, type, data: { config }, selected: false } as unknown as NodeProps<FlowCanvasNode>;
}

function OnCanvas({ stats, children }: { stats: FlowStatsMaps; children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <FlowNodeStatsProvider value={stats}>{children}</FlowNodeStatsProvider>
    </ReactFlowProvider>
  );
}

const noStats: FlowStats = {
  totalSessions: 0,
  finishedSessions: 0,
  activeOrWaitingSessions: 0,
  failedSessions: 0,
  nodes: [],
  recentFailures: [],
  buttons: [],
  conversions: 0,
};

const twoButtons: MessageNodeConfig = {
  blocks: [{ type: 'text', text: 'Каталог мехоҳед?', mediaId: null }],
  buttons: [
    { title: 'Ҳа', action: 'next', url: null, allowRepeat: false },
    { title: 'Сайт', action: 'url', url: 'https://example.com', allowRepeat: false },
    { title: 'Не', action: 'next', url: null, allowRepeat: false },
  ],
};

describe('clickRate', () => {
  it('is nothing before anyone got the message', () => {
    expect(clickRate(0, 0)).toBeNull();
  });

  it('is the clicks and their share of the people who got it', () => {
    expect(clickRate(3, 6)).toBe('3 · 50%');
    expect(clickRate(1, 3)).toBe('1 · 33%');
    expect(clickRate(0, 5)).toBe('0 · 0%');
    expect(clickRate(7, 7)).toBe('7 · 100%');
  });
});

describe('MessageNodeCard — button clicks', () => {
  it('shows each "next" button its own clicks next to the people who got the message', () => {
    render(
      <OnCanvas
        stats={toStatsMaps({
          ...noStats,
          nodes: [{ nodeId: 'm1', contactCount: 10 }],
          buttons: [
            { nodeId: 'm1', buttonIndex: 0, contactCount: 4 },
            { nodeId: 'm1', buttonIndex: 2, contactCount: 1 },
          ],
        })}>
        <MessageNodeCard {...nodeProps('m1', twoButtons, 'message')} />
      </OnCanvas>
    );

    expect(screen.getByText('4 · 40%')).toBeInTheDocument();
    expect(screen.getByText('1 · 10%')).toBeInTheDocument();
    expect(screen.getAllByTitle('stats.buttonClicks')).toHaveLength(2); // the link has none — nobody knows it was clicked
  });

  it("never shows another message's clicks", () => {
    render(
      <OnCanvas
        stats={toStatsMaps({
          ...noStats,
          nodes: [{ nodeId: 'm1', contactCount: 10 }],
          buttons: [{ nodeId: 'm2', buttonIndex: 0, contactCount: 9 }],
        })}>
        <MessageNodeCard {...nodeProps('m1', twoButtons, 'message')} />
      </OnCanvas>
    );

    expect(screen.queryByText('9 · 90%')).not.toBeInTheDocument();
    expect(screen.getAllByText('0 · 0%')).toHaveLength(2);
  });

  it('shows no numbers before the message reached anyone', () => {
    render(
      <OnCanvas stats={toStatsMaps(undefined)}>
        <MessageNodeCard {...nodeProps('m1', twoButtons, 'message')} />
      </OnCanvas>
    );

    expect(screen.queryAllByTitle('stats.buttonClicks')).toHaveLength(0);
  });
});

describe('goal step', () => {
  it('is offered as an action and saved as a clean config', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ActionNodePanel
          config={{ kind: 'delay', delayMinutes: 5 }}
          flows={[]}
          currentFlowId="f1"
          onChange={onChange}
        />
      </QueryClientProvider>
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'kind' }), 'conversion');

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'conversion' });
  });

  it('explains itself in the panel and on the canvas', () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ActionNodePanel config={{ kind: 'conversion' }} flows={[]} currentFlowId="f1" onChange={() => undefined} />
      </QueryClientProvider>
    );
    expect(screen.getByText('nodePanels.action.conversionHint')).toBeInTheDocument();

    render(
      <OnCanvas stats={toStatsMaps(undefined)}>
        <ActionNodeCard {...nodeProps('a1', { kind: 'conversion' }, 'action')} />
      </OnCanvas>
    );
    expect(screen.getByText('nodePanels.action.summary.conversion')).toBeInTheDocument();
  });

  it('the stats show how many reached the goal', async () => {
    const user = userEvent.setup();
    const stats: FlowStats = { ...noStats, totalSessions: 12, finishedSessions: 9, conversions: 5 };
    const flows = { ...staffFlowBuilderApi.flows, stats: vi.fn().mockResolvedValue(stats) };
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <FlowBuilderApiProvider value={{ ...staffFlowBuilderApi, flows }}>
          <FlowStatsPopover flowId="f1" nodes={[]} />
        </FlowBuilderApiProvider>
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: 'toolbar.stats' }));

    const box = (await screen.findByText('stats.conversions')).parentElement!;
    expect(box).toHaveTextContent('5');
    expect(flows.stats).toHaveBeenCalledWith('f1');
  });
});
