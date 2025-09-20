import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { fetch } from "cross-fetch";
import type { ReadonlyURLSearchParams } from "next/navigation";
import React from "react";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

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

// Mock next/navigation
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");

  // Helper to create a fully mocked URLSearchParams that passes TypeScript checks
  const createMockSearchParams = (
    defaultParams: Record<string, string> = {},
  ) => {
    const params = new Map(Object.entries(defaultParams));

    // Create an empty iterator
    const emptyIterator = {
      next: () => ({ done: true, value: undefined }),
      [Symbol.iterator]: function () {
        return this;
      },
    };

    return {
      get: vi.fn((key: string) => params.get(key) ?? null),
      getAll: vi.fn((key: string) =>
        params.has(key) ? [params.get(key) as string] : [],
      ),
      has: vi.fn((key: string) => params.has(key)),
      keys: vi.fn(() =>
        params.size
          ? Array.from(params.keys())[Symbol.iterator]()
          : emptyIterator,
      ),
      values: vi.fn(() =>
        params.size
          ? Array.from(params.values())[Symbol.iterator]()
          : emptyIterator,
      ),
      entries: vi.fn(() =>
        params.size
          ? Array.from(params.entries())[Symbol.iterator]()
          : emptyIterator,
      ),
      forEach: vi.fn(
        (
          callback: (
            value: string,
            key: string,
            parent: URLSearchParams,
          ) => void,
        ) => {
          params.forEach((value, key) => {
            // Using mock parent as URLSearchParams is not constructable in tests
            callback(value, key, {} as URLSearchParams);
          });
        },
      ),
      toString: vi.fn(() => {
        return Array.from(params.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
      }),
      // These props need to be present for ReadonlyURLSearchParams interface
      append: vi.fn(),
      delete: vi.fn(),
      set: vi.fn(),
      sort: vi.fn(),
      size: params.size,
      [Symbol.iterator]: vi.fn(() => params.entries()),
    };
  };

  return {
    ...actual,
    useSearchParams: vi.fn().mockReturnValue(createMockSearchParams()),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    })),
    usePathname: vi.fn(() => "/app"),
    readonlySearchParamsHook: vi.fn().mockReturnValue(createMockSearchParams()),
  };
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

// Mock up-fetch
vi.mock("@/lib/up-fetch", () => ({
  upfetch: vi.fn(),
}));

// Mock @workspace packages
vi.mock("@workspace/database", () => ({
  prisma: mockDeep(),
  BookmarkType: {
    VIDEO: "VIDEO",
    PAGE: "PAGE",
    IMAGE: "IMAGE",
    YOUTUBE: "YOUTUBE",
    TWEET: "TWEET",
    ARTICLE: "ARTICLE",
    PDF: "PDF",
    PRODUCT: "PRODUCT",
  },
  BookmarkStatus: {
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  },
}));

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
  // eslint-disable-next-line no-var
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