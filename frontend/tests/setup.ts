import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for Recharts in jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;
