import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHistoryBackedDialog } from './useHistoryBackedDialog';

describe('useHistoryBackedDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('pushes a history entry when it opens', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    renderHook(({ open }) => useHistoryBackedDialog(open, vi.fn()), { initialProps: { open: true } });

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('does not push again on re-render while still open', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const { rerender } = renderHook(({ open }) => useHistoryBackedDialog(open, vi.fn()), {
      initialProps: { open: true },
    });
    rerender({ open: true });

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('requestClose calls history.back() when it had pushed an entry, not onClose directly', () => {
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const onClose = vi.fn();
    const { result } = renderHook(({ open }) => useHistoryBackedDialog(open, onClose), {
      initialProps: { open: true },
    });

    result.current();

    expect(back).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the browser back button pops the pushed entry', () => {
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    const onClose = vi.fn();
    renderHook(({ open }) => useHistoryBackedDialog(open, onClose), { initialProps: { open: true } });

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requestClose calls onClose directly when nothing was pushed (never opened)', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const onClose = vi.fn();
    const { result } = renderHook(({ open }) => useHistoryBackedDialog(open, onClose), {
      initialProps: { open: false },
    });

    result.current();

    expect(back).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
