import "@testing-library/jest-dom";

// Unit suites cannot contact hosted services. Tests may replace fetch with a
// mock or use an explicitly local database; browser proofs run separately.
const originalFetch = globalThis.fetch;
if (originalFetch) {
  globalThis.fetch = (input, init) => {
    const address = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(address, "http://localhost");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      return Promise.reject(new Error("Hosted network access is disabled in unit tests; use mocks or a local database."));
    }
    return originalFetch(input, init);
  };
}

// Mock window.matchMedia
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

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).IntersectionObserver = MockIntersectionObserver;

// Mock crypto.randomUUID for Dnd-kit and other libraries
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  },
});
