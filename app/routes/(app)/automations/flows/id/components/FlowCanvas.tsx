import { useQuery } from '@tanstack/react-query';
import {
  Background,
  Controls,
  MiniMap,
  Panel as CanvasPanel,
  ReactFlow,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnReconnect,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { flowsApi } from '~/api/flows';
import type { FlowCanvasEdge, FlowCanvasNode } from '~/lib/flowGraph';
import type { FlowNodeType } from '~/types/flow';
import { ActionNodeCard } from './ActionNodeCard';
import { ConditionNodeCard } from './ConditionNodeCard';
import { DeletableEdge } from './DeletableEdge';
import { FlowNodeStatsProvider } from './flowStatsContext';
import { MessageNodeCard } from './MessageNodeCard';
import { NodePalette } from './NodePalette';
import { NoteNodeCard } from './NoteNodeCard';

const nodeTypes = {
  message: MessageNodeCard,
  condition: ConditionNodeCard,
  action: ActionNodeCard,
  note: NoteNodeCard,
};

const edgeTypes = { deletable: DeletableEdge };

interface FlowCanvasProps {
  flowId: string;
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];
  onNodesChange: (changes: NodeChange<FlowCanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowCanvasEdge>[]) => void;
  onConnect: OnConnect;
  onReconnect: OnReconnect<FlowCanvasEdge>;
  onDeleteEdge: (edgeId: string) => void;
  onNodeDragStart: () => void;
  onNodeDragStop: () => void;
  onSelectionChange: (selection: { nodeId: string | null; edgeId: string | null }) => void;
  onAddNode: (type: FlowNodeType) => void;
}

export function FlowCanvas({
  flowId,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onDeleteEdge,
  onNodeDragStart,
  onNodeDragStop,
  onSelectionChange,
  onAddNode,
}: FlowCanvasProps) {
  const handleSelectionChange: OnSelectionChangeFunc = ({ nodes: selectedNodes, edges: selectedEdges }) =>
    onSelectionChange({
      nodeId: selectedNodes[0]?.id ?? null,
      edgeId: selectedNodes.length === 0 ? (selectedEdges[0]?.id ?? null) : null,
    });

  // Ҳамон queryKey-и FlowStatsPopover — React Query кэшро мубодила мекунад, дархости
  // такрории шабака намеравад. Аломати "чанд кас то кадом қадам расид"-ро рост дар рӯи
  // ҳар корт нишон медиҳад (на танҳо дар popover-и алоҳида).
  const { data: stats } = useQuery({ queryKey: ['flows', flowId, 'stats'], queryFn: () => flowsApi.stats(flowId) });
  const nodeCountById = useMemo(() => new Map(stats?.nodes.map((n) => [n.nodeId, n.contactCount]) ?? []), [stats]);

  // onDelete тавассути data мегузарад (на мустақим ба edges-и аслӣ навишта мешавад) — то
  // toGraphRequest (лоиҳа санадро аз e.id/source/target месозад, на e.data) бетаъсир монад.
  const renderedEdges = useMemo(
    () => edges.map((e) => ({ ...e, type: 'deletable', data: { ...e.data, onDelete: onDeleteEdge } })),
    [edges, onDeleteEdge]
  );

  return (
    <div className="relative flex-1">
      <FlowNodeStatsProvider value={nodeCountById}>
        <ReactFlow
          nodes={nodes}
          edges={renderedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onSelectionChange={handleSelectionChange}
          deleteKeyCode={null} // route.tsx owns Delete/Backspace itself, so it can push undo history first
          fitView
          proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls />
          <MiniMap pannable zoomable className="!bg-sidebar" />
          <CanvasPanel position="top-left">
            <NodePalette onAdd={onAddNode} />
          </CanvasPanel>
        </ReactFlow>
      </FlowNodeStatsProvider>
    </div>
  );
}
