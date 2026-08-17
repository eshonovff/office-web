import "@testing-library/jest-dom/vitest";

// jsdom has no PointerEvent — fireEvent.pointerX drops pointerType/clientY
// silently, and base-ui primitives that dispatch a synthetic PointerEvent
// themselves (Checkbox, Switch, ...) throw outright without this. A minimal
// MouseEvent-based stand-in is enough. Needed here because the new internal
// note toggle (item 4) is the first inbox test to click a Switch.
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
