import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addEdge, reconnectEdge, useEdgesState, useNodesState, type OnConnect, type OnReconnect } from '@xyflow/react';
import { ArrowLeft, Loader2, Power, PowerOff, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { flowsApi } from '~/api/flows';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { useDebounce } from '~/hooks/useDebounce';
import {
  canConnect,
  defaultConfigForType,
  fromFlowDetail,
  newFlowElementId,
  toGraphRequest,
  type FlowCanvasEdge,
  type FlowCanvasNode,
} from '~/lib/flowGraph';
import type { FlowNodeConfig, FlowNodeType, UpdateFlowRequest } from '~/types/flow';
import { FlowCanvas } from './components/FlowCanvas';
import { FlowSettingsModal } from './components/FlowSettingsModal';
import { FlowStatsPopover } from './components/FlowStatsPopover';
import { NodeSettingsPanel } from './components/NodeSettingsPanel';
import { useFlowHistoryStore } from './store';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export default function FlowCanvasPage() {
  const { id } = useParams<{ id: string }>();
  const flowId = id!;
  const { t } = useTranslation(['flows', 'automations', 'common']);
  const queryClient = useQueryClient();
  const history = useFlowHistoryStore();

  const { data: flow, isLoading } = useQuery({ queryKey: ['flows', flowId], queryFn: () => flowsApi.get(flowId) });
  // For the goto_flow action's target picker (ActionNodePanel) — needs every other flow on
  // this flow's channel, so it only fires once the channel is known.
  const { data: siblingFlows = [] } = useQuery({
    queryKey: ['channels', flow?.channelId, 'flows'],
    queryFn: () => flowsApi.list(flow!.channelId),
    enabled: !!flow?.channelId,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowCanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowCanvasEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const hydratedForFlowId = useRef<string | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const preDragSnapshot = useRef<{ nodes: FlowCanvasNode[]; edges: FlowCanvasEdge[] } | null>(null);

  useEffect(() => {
    if (!flow || hydratedForFlowId.current === flow.id) return;
    const { nodes: initialNodes, edges: initialEdges } = fromFlowDetail(flow);
    setNodes(initialNodes);
    setEdges(initialEdges);
    hydratedForFlowId.current = flow.id;
    history.reset();
    // setNodes/setEdges (stable, from useNodesState/useEdgesState) and history.reset (stable
    // zustand action) are intentionally omitted — this must run only once per flow id, keyed
    // by the ref guard above, not on every render those would otherwise trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  const [dirtyTick, setDirtyTick] = useState(0);
  const debouncedDirtyTick = useDebounce(dirtyTick, 800);
  function markDirty() {
    setDirtyTick((t) => t + 1);
  }

  useEffect(() => {
    if (!hydratedForFlowId.current || debouncedDirtyTick === 0) return;
    setSaveStatus('saving');
    flowsApi
      .updateGraph(flowId, toGraphRequest(nodesRef.current, edgesRef.current))
      .then(() => setSaveStatus('saved'))
      .catch(() => {
        setSaveStatus('error');
        toast.error(t('toolbar.saveError'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDirtyTick]);

  const { mutate: updateFlowSettings, isPending: isSavingSettings } = useMutation({
    mutationFn: (payload: UpdateFlowRequest) => flowsApi.update(flowId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows', flowId] });
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success(t('toolbar.settingsSaved'));
      setSettingsOpen(false);
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: (isActive: boolean) => flowsApi.setActive(flowId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows', flowId] });
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  function handleAddNode(type: FlowNodeType) {
    history.push({ nodes: nodesRef.current, edges: edgesRef.current });
    const index = nodesRef.current.length;
    const newNode: FlowCanvasNode = {
      id: newFlowElementId(),
      type,
      position: { x: 120 + (index % 5) * 260, y: 120 + Math.floor(index / 5) * 220 },
      data: { config: defaultConfigForType(type) },
    };
    setNodes((nds) => [...nds, newNode]);
    markDirty();
  }

  function handleDeleteNode(nodeId: string) {
    history.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
    markDirty();
  }

  function handleDeleteEdge(edgeId: string) {
    history.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdgeId(null);
    markDirty();
  }

  const handleConnect: OnConnect = (connection) => {
    const validation = canConnect(nodesRef.current, edgesRef.current, connection);
    if (!validation.ok) {
      toast.error(validation.reason);
      return;
    }
    history.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setEdges((eds) => addEdge({ ...connection, id: newFlowElementId() }, eds));
    markDirty();
  };

  // Кашидани нӯги хати мавҷуда ба нодаи дигар (ба ҷои нест кардан + пайванди нав кашидан).
  // oldEdge худаш аз "аллакай истифодашуда"-и canConnect бароварда мешавад — вагарна порти
  // худи ҳамин хат ҳамеша "банд" ба назар мерасад ва reconnect ҳеҷ гоҳ иҷозат намеёбад.
  const handleReconnect: OnReconnect<FlowCanvasEdge> = (oldEdge, newConnection) => {
    const otherEdges = edgesRef.current.filter((e) => e.id !== oldEdge.id);
    const validation = canConnect(nodesRef.current, otherEdges, newConnection);
    if (!validation.ok) {
      toast.error(validation.reason);
      return;
    }
    history.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    markDirty();
  };

  function handleNodeDragStart() {
    preDragSnapshot.current = { nodes: nodesRef.current, edges: edgesRef.current };
  }

  function handleNodeDragStop() {
    if (preDragSnapshot.current) history.push(preDragSnapshot.current);
    preDragSnapshot.current = null;
    markDirty();
  }

  function handleNodeConfigChange(nodeId: string, config: FlowNodeConfig) {
    history.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { config } } : n)));
    markDirty();
  }

  function applySnapshot(snapshot: { nodes: FlowCanvasNode[]; edges: FlowCanvasEdge[] } | null) {
    if (!snapshot) return;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    markDirty();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableElement(e.target)) return;

      const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
      const isRedo =
        (e.metaKey || e.ctrlKey) && (e.shiftKey ? e.key.toLowerCase() === 'z' : e.key.toLowerCase() === 'y');
      if (isUndo) {
        e.preventDefault();
        applySnapshot(history.undo({ nodes: nodesRef.current, edges: edgesRef.current }));
        return;
      }
      if (isRedo) {
        e.preventDefault();
        applySnapshot(history.redo({ nodes: nodesRef.current, edges: edgesRef.current }));
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) handleDeleteNode(selectedNodeId);
        else if (selectedEdgeId) handleDeleteEdge(selectedEdgeId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, selectedEdgeId]);

  if (isLoading || !flow) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" render={<Link to="/automations" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="truncate font-semibold">{flow.name}</span>
          <Badge variant={flow.isActive ? 'default' : 'outline'} className="text-2xs">
            {flow.isActive ? t('active', { ns: 'instagramAutomation' }) : t('inactive', { ns: 'instagramAutomation' })}
          </Badge>
          <SaveStatusIndicator status={saveStatus} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={!history.canUndo}
            onClick={() => applySnapshot(history.undo({ nodes: nodesRef.current, edges: edgesRef.current }))}>
            {t('toolbar.undo')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!history.canRedo}
            onClick={() => applySnapshot(history.redo({ nodes: nodesRef.current, edges: edgesRef.current }))}>
            {t('toolbar.redo')}
          </Button>
          <FlowStatsPopover flowId={flowId} nodes={nodes} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleActive(!flow.isActive)}>
            {flow.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
            {flow.isActive ? t('disable', { ns: 'instagramAutomation' }) : t('enable', { ns: 'instagramAutomation' })}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-3.5 w-3.5" />
            {t('toolbar.settings')}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FlowCanvas
          flowId={flowId}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onReconnect={handleReconnect}
          onDeleteEdge={handleDeleteEdge}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onSelectionChange={({ nodeId, edgeId }) => {
            setSelectedNodeId(nodeId);
            setSelectedEdgeId(edgeId);
          }}
          onAddNode={handleAddNode}
        />
        <NodeSettingsPanel
          node={selectedNode}
          flowId={flowId}
          channelId={flow.channelId}
          flows={siblingFlows}
          nodes={nodes}
          onChange={handleNodeConfigChange}
          onDelete={handleDeleteNode}
        />
      </div>

      {settingsOpen && (
        <FlowSettingsModal
          key={flow.id}
          channelId={flow.channelId}
          flow={flow}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          isSaving={isSavingSettings}
          onSave={(payload) => updateFlowSettings(payload)}
        />
      )}
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const { t } = useTranslation('flows');
  if (status === 'idle') return null;
  return (
    <span className="text-muted-foreground text-2xs">
      {status === 'saving' && t('toolbar.saving')}
      {status === 'saved' && t('toolbar.saved')}
      {status === 'error' && t('toolbar.saveError')}
    </span>
  );
}
