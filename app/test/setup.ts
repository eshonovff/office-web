import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom has no matchMedia implementation — useIsMobile/useInboxBreakpoint
// (and anything built on them) would throw without this. Defaults every
// query to non-matching (desktop); tests that care about a specific
// breakpoint mock the hook directly instead of trying to drive this.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// jsdom also has no PointerEvent — fireEvent.pointerX drops pointerType/
// clientY silently, and base-ui primitives that dispatch a synthetic
// PointerEvent themselves (Checkbox, Switch, ...) throw outright without
// this. A minimal MouseEvent-based stand-in is enough for both.
if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? "mouse";
    }
  }
  // @ts-expect-error minimal polyfill, not spec-complete
  globalThis.PointerEvent = PointerEventPolyfill;
}
