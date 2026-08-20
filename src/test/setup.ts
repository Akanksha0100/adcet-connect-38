import "@testing-library/jest-dom";

// jsdom ships no IntersectionObserver; framer-motion's `whileInView` needs one.
// The stub reports elements as immediately visible so scroll-reveal sections render.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
globalThis.IntersectionObserver = window.IntersectionObserver;

// Radix primitives that measure themselves (ScrollArea, Select) construct a
// ResizeObserver on mount, which jsdom does not provide. Nothing in a test
// depends on the measurements, so an inert stub is enough to let them render.
class MockResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
globalThis.ResizeObserver = window.ResizeObserver;

// jsdom has no layout engine, so scrolling is a no-op rather than an error.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
