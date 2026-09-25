import { beforeEach, describe, expect, it } from 'vitest';
import { useFlowHistoryStore } from './store';
import type { FlowGraphSnapshot } from './store';

function snapshot(id: string): FlowGraphSnapshot {
  return { nodes: [{ id, type: 'note', position: { x: 0, y: 0 }, data: { config: { text: id } } }], edges: [] };
}

beforeEach(() => {
  useFlowHistoryStore.getState().reset();
});

describe('useFlowHistoryStore', () => {
  it('starts with nothing to undo or redo', () => {
    const state = useFlowHistoryStore.getState();
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });

  it('undo returns null when there is no history', () => {
    expect(useFlowHistoryStore.getState().undo(snapshot('a'))).toBeNull();
  });

  it('redo returns null when there is no future', () => {
    expect(useFlowHistoryStore.getState().redo(snapshot('a'))).toBeNull();
  });

  it('push then undo returns the pushed snapshot and enables redo', () => {
    const store = useFlowHistoryStore.getState();
    store.push(snapshot('a'));
    const result = useFlowHistoryStore.getState().undo(snapshot('b'));
    expect(result).toEqual(snapshot('a'));
    expect(useFlowHistoryStore.getState().canUndo).toBe(false);
    expect(useFlowHistoryStore.getState().canRedo).toBe(true);
  });

  it('undo then redo round-trips back to the current snapshot', () => {
    const store = useFlowHistoryStore.getState();
    store.push(snapshot('a'));
    const undone = useFlowHistoryStore.getState().undo(snapshot('b'))!;
    const redone = useFlowHistoryStore.getState().redo(undone);
    expect(redone).toEqual(snapshot('b'));
    expect(useFlowHistoryStore.getState().canUndo).toBe(true);
    expect(useFlowHistoryStore.getState().canRedo).toBe(false);
  });

  it('a new push after undo clears the redo stack', () => {
    const store = useFlowHistoryStore.getState();
    store.push(snapshot('a'));
    useFlowHistoryStore.getState().undo(snapshot('b'));
    useFlowHistoryStore.getState().push(snapshot('c'));
    expect(useFlowHistoryStore.getState().canRedo).toBe(false);
  });

  it('caps history at 50 entries', () => {
    const store = useFlowHistoryStore.getState();
    for (let i = 0; i < 60; i++) store.push(snapshot(String(i)));
    expect(useFlowHistoryStore.getState().past).toHaveLength(50);
    expect(useFlowHistoryStore.getState().past[0]).toEqual(snapshot('10'));
  });
});
