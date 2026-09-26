import { createContext, useContext } from 'react';
import type { FlowStats } from '~/types/flow';

// The flow's numbers on the canvas (FlowStats, see FlowCanvas): how many people reached each node,
// and how many clicked each "next" button — a Context, not props, because @xyflow/react's
// nodeTypes only get NodeProps. Empty maps until the stats arrive.
export interface FlowStatsMaps {
  /** nodeId → people who reached it. */
  nodes: Map<string, number>;
  /** "nodeId:buttonIndex" → people who clicked it (each once). */
  buttons: Map<string, number>;
}

const buttonKey = (nodeId: string, buttonIndex: number) => `${nodeId}:${buttonIndex}`;

export function toStatsMaps(stats: FlowStats | undefined): FlowStatsMaps {
  return {
    nodes: new Map(stats?.nodes.map((n) => [n.nodeId, n.contactCount]) ?? []),
    buttons: new Map(stats?.buttons?.map((b) => [buttonKey(b.nodeId, b.buttonIndex), b.contactCount]) ?? []),
  };
}

const FlowNodeStatsContext = createContext<FlowStatsMaps>(toStatsMaps(undefined));

export const FlowNodeStatsProvider = FlowNodeStatsContext.Provider;

export function useNodeContactCount(nodeId: string): number {
  return useContext(FlowNodeStatsContext).nodes.get(nodeId) ?? 0;
}

export function useButtonClickCounts(nodeId: string): (buttonIndex: number) => number {
  const { buttons } = useContext(FlowNodeStatsContext);
  return (buttonIndex) => buttons.get(buttonKey(nodeId, buttonIndex)) ?? 0;
}

/** "12 · 34%" — clicks and their share of the people who got the message; null before anyone did. */
export function clickRate(clicks: number, reached: number): string | null {
  if (reached <= 0) return null;
  return `${clicks} · ${Math.round((clicks / reached) * 100)}%`;
}
