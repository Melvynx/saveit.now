import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { fetch } from "cross-fetch";
import React from "react";
import { beforeEach, vi } from "vitest";

beforeEach(() => {
  cleanup();
});

// MOCKS

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      mockLocalStorage[key] = undefined as unknown as string;
    }),
    clear: vi.fn(() => {
      Object.keys(mockLocalStorage).forEach((key) => {
        mockLocalStorage[key] = undefined as unknown as string;
      });
    }),
  },
  writable: true,
});

// Mock nuqs
vi.mock("nuqs", () => ({
  useQueryState: vi.fn(() => ["", vi.fn()]),
  parseAsString: {
    withDefault: vi.fn(() => ({
      defaultValue: "",
    })),
  },
}));

// Mock react-hotkeys-hook
vi.mock("react-hotkeys-hook", () => ({
  useHotkeys: vi.fn(),
}));

// (Prisma/up-fetch mocks removed — the backend now lives in Convex.)

// Mock external APIs and services
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  QueryClient: vi.fn(() => ({
    defaultOptions: {},
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Set global fetch
global.fetch = fetch;

// Define the type for our global helper
declare global {
   
  var createTestSearchParams: (
    params?: Record<string, string>,
  ) => ReadonlyURLSearchParams;
}

beforeEach(() => {
  // Reset localStorage mock
  vi.mocked(window.localStorage.getItem).mockClear();
  vi.mocked(window.localStorage.setItem).mockClear();
  vi.mocked(window.localStorage.removeItem).mockClear();
  vi.mocked(window.localStorage.clear).mockClear();

  // Mock toast
  vi.mock("sonner", () => ({
    toast: {
      error: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  }));

  // Clear localStorage without using delete
  Object.keys(mockLocalStorage).forEach((key) => {
    mockLocalStorage[key] = undefined as unknown as string;
  });

  // Expose helper for creating search params mocks with specific values
  global.createTestSearchParams = (
    params: Record<string, string> = {},
  ): ReadonlyURLSearchParams => {
    const mockSearchParams = {
      get: vi.fn((key: string) => params[key] ?? null),
      getAll: vi.fn((key: string) => (params[key] ? [params[key]] : [])),
      has: vi.fn((key: string) => key in params),
      keys: vi.fn(() => Object.keys(params)[Symbol.iterator]()),
      values: vi.fn(() => Object.values(params)[Symbol.iterator]()),
      entries: vi.fn(() => Object.entries(params)[Symbol.iterator]()),
      forEach: vi.fn(
        (
          callback: (
            value: string,
            key: string,
            parent: URLSearchParams,
          ) => void,
        ) => {
          Object.entries(params).forEach(([key, value]) => {
            // Using mock parent as URLSearchParams is not constructable in tests
            callback(value, key, {} as URLSearchParams);
          });
        },
      ),
      toString: vi.fn(() => {
        return Object.entries(params)
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
      }),
      // These props need to be present for ReadonlyURLSearchParams interface
      append: vi.fn(),
      delete: vi.fn(),
      set: vi.fn(),
      sort: vi.fn(),
      size: Object.keys(params).length,
      [Symbol.iterator]: vi.fn(() => Object.entries(params)[Symbol.iterator]()),
    };

    return mockSearchParams as ReadonlyURLSearchParams;
  };
});
