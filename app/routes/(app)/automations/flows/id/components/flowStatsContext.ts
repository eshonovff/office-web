import { createContext, useContext } from 'react';

// nodeId → шумораи контактҳое, ки то ин нод расидаанд (FlowStats.nodes, ниг. FlowCanvas) —
// Context на prop-drilling, чунки nodeTypes-и @xyflow/react танҳо NodeProps мегиранд, на
// prop-ҳои иловагӣ. Пешфарз (Map холӣ) вақте истифода мешавад, ки canvas ҳанӯз омор нагирифтааст.
const FlowNodeStatsContext = createContext<Map<string, number>>(new Map());

export const FlowNodeStatsProvider = FlowNodeStatsContext.Provider;

export function useNodeContactCount(nodeId: string): number {
  return useContext(FlowNodeStatsContext).get(nodeId) ?? 0;
}
