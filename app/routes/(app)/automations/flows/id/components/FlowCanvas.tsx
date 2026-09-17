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
import type { FlowCanvasEdge, FlowCanvasNode } from '~/lib/flowGraph';
import type { FlowNodeType } from '~/types/flow';
import { ActionNodeCard } from './ActionNodeCard';
import { ConditionNodeCard } from './ConditionNodeCard';
import { MessageNodeCard } from './MessageNodeCard';
import { NodePalette } from './NodePalette';
import { NoteNodeCard } from './NoteNodeCard';

const nodeTypes = {
  message: MessageNodeCard,
  condition: ConditionNodeCard,
  action: ActionNodeCard,
  note: NoteNodeCard,
};

interface FlowCanvasProps {
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];
  onNodesChange: (changes: NodeChange<FlowCanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowCanvasEdge>[]) => void;
  onConnect: OnConnect;
  onReconnect: OnReconnect<FlowCanvasEdge>;
  onNodeDragStart: () => void;
  onNodeDragStop: () => void;
  onSelectionChange: (selection: { nodeId: string | null; edgeId: string | null }) => void;
  onAddNode: (type: FlowNodeType) => void;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
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

  return (
    <div className="relative flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
    </div>
  );
}
