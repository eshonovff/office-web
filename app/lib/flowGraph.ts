import type { Edge, Node } from '@xyflow/react';
import {
  FLOW_PORT_DEFAULT,
  FLOW_PORT_MATCH,
  FLOW_PORT_NOMATCH,
  buttonPort,
  type ActionNodeConfig,
  type FlowDetail,
  type FlowEdgeDto,
  type FlowEdgeInput,
  type FlowNodeConfig,
  type FlowNodeDto,
  type FlowNodeInput,
  type FlowNodeType,
  type MessageNodeConfig,
  type UpdateFlowGraphRequest,
} from '~/types/flow';

export interface FlowNodeData extends Record<string, unknown> {
  config: FlowNodeConfig;
}

export type FlowCanvasNode = Node<FlowNodeData, FlowNodeType>;
export type FlowCanvasEdge = Edge;

export function newFlowElementId(): string {
  return crypto.randomUUID();
}

export function nodeDtoToCanvasNode(node: FlowNodeDto): FlowCanvasNode {
  return {
    id: node.id,
    type: node.type,
    position: { x: node.x, y: node.y },
    data: { config: node.config as FlowNodeConfig },
  };
}

export function edgeDtoToCanvasEdge(edge: FlowEdgeDto): FlowCanvasEdge {
  return { id: edge.id, source: edge.fromNodeId, sourceHandle: edge.fromPort, target: edge.toNodeId };
}

export function fromFlowDetail(detail: FlowDetail): { nodes: FlowCanvasNode[]; edges: FlowCanvasEdge[] } {
  return {
    nodes: detail.nodes.map(nodeDtoToCanvasNode),
    edges: detail.edges.map(edgeDtoToCanvasEdge),
  };
}

// Full-replace request body for PUT /flows/{id}/graph — mirrors
// UpdateFlowGraphRequest's idempotent-replace design (ниг. Contracts.cs).
export function toGraphRequest(nodes: FlowCanvasNode[], edges: FlowCanvasEdge[]): UpdateFlowGraphRequest {
  return {
    nodes: nodes.map((n): FlowNodeInput => ({
      id: n.id,
      type: n.type as FlowNodeType,
      config: n.data.config,
      x: n.position.x,
      y: n.position.y,
    })),
    edges: edges.map((e): FlowEdgeInput => ({
      id: e.id,
      fromNodeId: e.source,
      fromPort: e.sourceHandle ?? FLOW_PORT_DEFAULT,
      toNodeId: e.target,
    })),
  };
}

/**
 * The valid FromPort values a node can emit, mirroring FlowEngine's outcome
 * ports exactly (ниг. Channels/Flows/FlowEngine.cs): a message node with
 * buttons waits for a click and resumes via `button:{index}`; without
 * buttons it just sends and continues via `default`. condition always
 * branches match/nomatch. action and note nodes are fixed.
 */
export function getOutputPorts(type: FlowNodeType, config: FlowNodeConfig): string[] {
  switch (type) {
    case 'message': {
      const buttons = (config as MessageNodeConfig).buttons ?? [];
      return buttons.length > 0 ? buttons.map((_, index) => buttonPort(index)) : [FLOW_PORT_DEFAULT];
    }
    case 'condition':
      return [FLOW_PORT_MATCH, FLOW_PORT_NOMATCH];
    case 'action':
      // goto_flow ends the session on the backend (FlowEngine.ExecuteActionNodeAsync
      // returns EndSession:true with a null port) — an edge out of it would never fire,
      // so it's structurally terminal and shouldn't offer an output port.
      return (config as ActionNodeConfig).kind === 'goto_flow' ? [] : [FLOW_PORT_DEFAULT];
    case 'note':
      return [];
  }
}

export function defaultConfigForType(type: FlowNodeType): FlowNodeConfig {
  switch (type) {
    case 'message':
      return { blocks: [{ type: 'text', text: '', mediaId: null }], buttons: [] };
    case 'condition':
      return { match: 'all', rules: [] };
    case 'action':
      return { kind: 'add_tags', tags: [] };
    case 'note':
      return { text: '' };
  }
}

export type ConnectionValidation = { ok: true } | { ok: false; reason: string };

interface ConnectionCandidate {
  source: string;
  sourceHandle: string | null | undefined;
  target: string;
}

/**
 * Every port represents exactly one outcome (ниг. getOutputPorts), so at
 * most one outgoing edge per port makes sense — drawing a second edge from
 * an already-connected port would just be unreachable, not an alternate
 * branch.
 */
export function canConnect(
  nodes: FlowCanvasNode[],
  edges: FlowCanvasEdge[],
  candidate: ConnectionCandidate
): ConnectionValidation {
  const sourceNode = nodes.find((n) => n.id === candidate.source);
  if (!sourceNode) return { ok: false, reason: 'Нодаи сарчашма ёфт нашуд.' };

  const targetNode = nodes.find((n) => n.id === candidate.target);
  if (!targetNode) return { ok: false, reason: 'Нодаи мақсад ёфт нашуд.' };

  const port = candidate.sourceHandle ?? FLOW_PORT_DEFAULT;
  const validPorts = getOutputPorts(sourceNode.type as FlowNodeType, sourceNode.data.config);
  if (!validPorts.includes(port)) return { ok: false, reason: `Ин навъи нод порти "${port}" надорад.` };

  const alreadyUsed = edges.some(
    (e) => e.source === candidate.source && (e.sourceHandle ?? FLOW_PORT_DEFAULT) === port
  );
  if (alreadyUsed) return { ok: false, reason: 'Ин порт аллакай пайванд дорад.' };

  return { ok: true };
}
