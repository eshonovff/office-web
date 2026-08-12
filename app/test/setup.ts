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
