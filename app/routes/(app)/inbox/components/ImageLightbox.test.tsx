import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageLightbox } from './ImageLightbox';

// jsdom in this test environment has no global PointerEvent, so
// fireEvent.pointerDown/Move/Up silently drop pointerType/clientY — a
// minimal MouseEvent-based stand-in carries them through instead.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, params: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
    super(type, params);
    this.pointerId = params.pointerId ?? 0;
    this.pointerType = params.pointerType ?? 'mouse';
  }
}

function firePointer(el: Element, type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string }) {
  act(() => {
    el.dispatchEvent(new FakePointerEvent(type, { bubbles: true, cancelable: true, ...init }));
  });
}

describe('ImageLightbox', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', { configurable: true, value: vi.fn() });
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  it('renders the image when open with a src', () => {
    render(<ImageLightbox open src="blob:image-1" alt="photo.jpg" onOpenChange={vi.fn()} />);
    expect(screen.getByAltText('photo.jpg')).toHaveAttribute('src', 'blob:image-1');
  });

  it('closes via history.back() when a touch drag past the threshold releases', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(<ImageLightbox open src="blob:image-1" alt="photo.jpg" onOpenChange={vi.fn()} />);
    const surface = screen.getByAltText('photo.jpg').parentElement!;

    firePointer(surface, 'pointerdown', { pointerType: 'touch', clientY: 100, pointerId: 1 });
    firePointer(surface, 'pointermove', { pointerType: 'touch', clientY: 300, pointerId: 1 });
    firePointer(surface, 'pointerup', { pointerType: 'touch', clientY: 300, pointerId: 1 });

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('snaps back without closing when a touch drag stays under the threshold', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(<ImageLightbox open src="blob:image-1" alt="photo.jpg" onOpenChange={vi.fn()} />);
    const surface = screen.getByAltText('photo.jpg').parentElement!;

    firePointer(surface, 'pointerdown', { pointerType: 'touch', clientY: 100, pointerId: 1 });
    firePointer(surface, 'pointermove', { pointerType: 'touch', clientY: 140, pointerId: 1 });
    firePointer(surface, 'pointerup', { pointerType: 'touch', clientY: 140, pointerId: 1 });

    expect(back).not.toHaveBeenCalled();
  });

  it('ignores a mouse drag — only touch dismisses', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(<ImageLightbox open src="blob:image-1" alt="photo.jpg" onOpenChange={vi.fn()} />);
    const surface = screen.getByAltText('photo.jpg').parentElement!;

    firePointer(surface, 'pointerdown', { pointerType: 'mouse', clientY: 100, pointerId: 1 });
    firePointer(surface, 'pointermove', { pointerType: 'mouse', clientY: 400, pointerId: 1 });
    firePointer(surface, 'pointerup', { pointerType: 'mouse', clientY: 400, pointerId: 1 });

    expect(back).not.toHaveBeenCalled();
  });
});
