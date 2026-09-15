import { create } from 'zustand';
import type { FlowCanvasEdge, FlowCanvasNode } from '~/lib/flowGraph';

export interface FlowGraphSnapshot {
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];
}

const MAX_HISTORY = 50;

// Bespoke per-route store (алгуи inbox/store.ts), on `past`/`future` stacks of full
// graph snapshots — pushed on discrete actions (add/delete node, connect/delete edge,
// drag-stop, panel save), not per keystroke or per drag frame. `undo`/`redo` take the
// CURRENT snapshot as an argument (the canvas is the source of truth, this store never
// holds live state) and return what the caller should apply back via setNodes/setEdges,
// or null if there's nothing to undo/redo.
interface FlowHistoryState {
  past: FlowGraphSnapshot[];
  future: FlowGraphSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  push: (current: FlowGraphSnapshot) => void;
  undo: (current: FlowGraphSnapshot) => FlowGraphSnapshot | null;
  redo: (current: FlowGraphSnapshot) => FlowGraphSnapshot | null;
  reset: () => void;
}

export const useFlowHistoryStore = create<FlowHistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  push: (current) =>
    set((state) => {
      const past = [...state.past, current].slice(-MAX_HISTORY);
      return { past, future: [], canUndo: past.length > 0, canRedo: false };
    }),

  undo: (current) => {
    const { past } = get();
    if (past.length === 0) return null;
    const previous = past[past.length - 1];
    set((state) => {
      const nextPast = state.past.slice(0, -1);
      const future = [current, ...state.future];
      return { past: nextPast, future, canUndo: nextPast.length > 0, canRedo: true };
    });
    return previous;
  },

  redo: (current) => {
    const { future } = get();
    if (future.length === 0) return null;
    const next = future[0];
    set((state) => {
      const past = [...state.past, current];
      const nextFuture = state.future.slice(1);
      return { past, future: nextFuture, canUndo: true, canRedo: nextFuture.length > 0 };
    });
    return next;
  },

  reset: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}));
