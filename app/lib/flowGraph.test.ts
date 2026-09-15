import { describe, expect, it } from 'vitest';
import {
  canConnect,
  edgeDtoToCanvasEdge,
  fromFlowDetail,
  getOutputPorts,
  nodeDtoToCanvasNode,
  toGraphRequest,
  type FlowCanvasNode,
} from '~/lib/flowGraph';
import type {
  ActionNodeConfig,
  ConditionNodeConfig,
  FlowDetail,
  MessageNodeConfig,
  NoteNodeConfig,
} from '~/types/flow';

function messageNode(id: string, buttons: MessageNodeConfig['buttons'] = []): FlowCanvasNode {
  return {
    id,
    type: 'message',
    position: { x: 0, y: 0 },
    data: { config: { blocks: [{ type: 'text', text: 'hi', mediaId: null }], buttons } },
  };
}

function conditionNode(id: string): FlowCanvasNode {
  const config: ConditionNodeConfig = { match: 'all', rules: [] };
  return { id, type: 'condition', position: { x: 0, y: 0 }, data: { config } };
}

function actionNode(id: string): FlowCanvasNode {
  const config: ActionNodeConfig = { kind: 'add_tags', tags: ['x'] };
  return { id, type: 'action', position: { x: 0, y: 0 }, data: { config } };
}

function noteNode(id: string): FlowCanvasNode {
  const config: NoteNodeConfig = { text: 'note' };
  return { id, type: 'note', position: { x: 0, y: 0 }, data: { config } };
}

describe('getOutputPorts', () => {
  it('message without buttons has a single default port', () => {
    expect(getOutputPorts('message', messageNode('a').data.config as MessageNodeConfig)).toEqual(['default']);
  });

  it('message with buttons has one port per button, indexed', () => {
    const config = messageNode('a', [
      { title: 'A', action: 'next', url: null, allowRepeat: false },
      { title: 'B', action: 'url', url: 'https://x', allowRepeat: true },
    ]).data.config as MessageNodeConfig;
    expect(getOutputPorts('message', config)).toEqual(['button:0', 'button:1']);
  });

  it('condition has match/nomatch', () => {
    expect(getOutputPorts('condition', conditionNode('a').data.config as ConditionNodeConfig)).toEqual([
      'match',
      'nomatch',
    ]);
  });

  it('action has a single default port', () => {
    expect(getOutputPorts('action', actionNode('a').data.config as ActionNodeConfig)).toEqual(['default']);
  });

  it('goto_flow action is terminal — no output port', () => {
    const config: ActionNodeConfig = { kind: 'goto_flow', targetFlowId: 'f1' };
    expect(getOutputPorts('action', config)).toEqual([]);
  });

  it('note has no ports', () => {
    expect(getOutputPorts('note', noteNode('a').data.config as NoteNodeConfig)).toEqual([]);
  });
});

describe('canConnect', () => {
  it('rejects an unknown source node', () => {
    const nodes = [conditionNode('b')];
    const result = canConnect(nodes, [], { source: 'missing', sourceHandle: 'match', target: 'b' });
    expect(result).toEqual({ ok: false, reason: 'Нодаи сарчашма ёфт нашуд.' });
  });

  it('rejects an unknown target node', () => {
    const nodes = [conditionNode('a')];
    const result = canConnect(nodes, [], { source: 'a', sourceHandle: 'match', target: 'missing' });
    expect(result).toEqual({ ok: false, reason: 'Нодаи мақсад ёфт нашуд.' });
  });

  it('rejects a port that does not exist for the node type', () => {
    const nodes = [messageNode('a'), conditionNode('b')];
    const result = canConnect(nodes, [], { source: 'a', sourceHandle: 'match', target: 'b' });
    expect(result.ok).toBe(false);
  });

  it('accepts a valid, unused port', () => {
    const nodes = [conditionNode('a'), conditionNode('b')];
    const result = canConnect(nodes, [], { source: 'a', sourceHandle: 'match', target: 'b' });
    expect(result).toEqual({ ok: true });
  });

  it('rejects a port that already has an outgoing edge', () => {
    const nodes = [conditionNode('a'), conditionNode('b'), conditionNode('c')];
    const edges = [edgeDtoToCanvasEdge({ id: 'e1', fromNodeId: 'a', fromPort: 'match', toNodeId: 'b' })];
    const result = canConnect(nodes, edges, { source: 'a', sourceHandle: 'match', target: 'c' });
    expect(result.ok).toBe(false);
  });

  it('defaults a missing sourceHandle to "default"', () => {
    const nodes = [actionNode('a'), actionNode('b')];
    const result = canConnect(nodes, [], { source: 'a', sourceHandle: null, target: 'b' });
    expect(result).toEqual({ ok: true });
  });
});

describe('nodeDtoToCanvasNode / edgeDtoToCanvasEdge / fromFlowDetail', () => {
  it('maps a node dto to xyflow shape', () => {
    const config: NoteNodeConfig = { text: 'hi' };
    const node = nodeDtoToCanvasNode({ id: 'n1', type: 'note', config, x: 10, y: 20 });
    expect(node).toEqual({ id: 'n1', type: 'note', position: { x: 10, y: 20 }, data: { config } });
  });

  it('maps an edge dto to xyflow shape, fromPort becoming sourceHandle', () => {
    const edge = edgeDtoToCanvasEdge({ id: 'e1', fromNodeId: 'n1', fromPort: 'match', toNodeId: 'n2' });
    expect(edge).toEqual({ id: 'e1', source: 'n1', sourceHandle: 'match', target: 'n2' });
  });

  it('maps a full FlowDetail into canvas nodes+edges', () => {
    const detail: FlowDetail = {
      id: 'f1',
      channelId: 'c1',
      name: 'Test',
      isActive: true,
      triggerType: 'instagram_dm',
      triggerConfig: { matchMode: 'all', keywords: [], postScope: 'all', postIds: [] },
      nodes: [{ id: 'n1', type: 'note', config: { text: 'hi' }, x: 0, y: 0 }],
      edges: [{ id: 'e1', fromNodeId: 'n1', fromPort: 'default', toNodeId: 'n1' }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const { nodes, edges } = fromFlowDetail(detail);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(1);
    expect(nodes[0].id).toBe('n1');
    expect(edges[0]).toEqual({ id: 'e1', source: 'n1', sourceHandle: 'default', target: 'n1' });
  });
});

describe('toGraphRequest', () => {
  it('maps canvas nodes/edges back to the backend request shape', () => {
    const nodes = [noteNode('n1')];
    const edges = [edgeDtoToCanvasEdge({ id: 'e1', fromNodeId: 'n1', fromPort: 'default', toNodeId: 'n1' })];
    const request = toGraphRequest(nodes, edges);
    expect(request.nodes).toEqual([{ id: 'n1', type: 'note', config: { text: 'note' }, x: 0, y: 0 }]);
    expect(request.edges).toEqual([{ id: 'e1', fromNodeId: 'n1', fromPort: 'default', toNodeId: 'n1' }]);
  });

  it('falls back sourceHandle-less edges to the default port', () => {
    const nodes = [actionNode('n1')];
    const edges = [{ id: 'e1', source: 'n1', target: 'n1' }];
    const request = toGraphRequest(nodes, edges);
    expect(request.edges[0].fromPort).toBe('default');
  });
});
