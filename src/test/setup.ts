import "@testing-library/jest-dom";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { mockQuestionsResponse } from "./mocks";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    return React.createElement("img", { src, alt, ...props });
  },
}));

// Mock Next.js Link component  
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => {
    return React.createElement("a", { href, ...props }, children);
  },
}));

// Mock global fetch for API calls
beforeAll(() => {
  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlString = typeof url === "string" ? url : url.toString();

    // Mock /api/questions
    if (urlString.includes("/api/questions")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockQuestionsResponse,
      } as Response);
    }

    // Mock /api/reviews
    if (urlString.includes("/api/reviews")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ reviews: [] }),
      } as Response);
    }

    // Default mock for other endpoints
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
  });
});
