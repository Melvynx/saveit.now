import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
  useLocation: () => ({ pathname: "/app", search: {} }),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

import { BookmarkCardError } from "@/features/app/bookmark-card/bookmark-card-error";
import type { BookmarkCardData } from "@/features/app/bookmark-card/bookmark.types";

const failedBookmark = (
  overrides: Partial<BookmarkCardData>,
): BookmarkCardData => ({
  id: "bookmark-1",
  url: "https://example.com/article",
  type: "PAGE",
  title: null,
  summary: null,
  ogImageUrl: null,
  metadata: null,
  starred: false,
  read: false,
  status: "ERROR",
  faviconUrl: null,
  ...overrides,
});

describe("BookmarkCardError", () => {
  it("shows a generic sentence instead of stored AI provider errors", () => {
    render(
      <BookmarkCardError
        bookmark={failedBookmark({
          processingError:
            "Uncaught AI_APICallError: Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing. Learn more at https://ai.google.dev/gemini-api/...",
        })}
      />,
    );

    const card = screen.getByTestId("bookmark-card-error");
    expect(
      screen.getByText(
        "Our AI service had a temporary problem. Retry in a few minutes.",
      ),
    ).toBeTruthy();
    expect(card.textContent).not.toContain("ai.studio");
    expect(card.textContent).not.toContain("AI_APICallError");
  });

  it("hides legacy OpenAI errors stored in metadata", () => {
    render(
      <BookmarkCardError
        bookmark={failedBookmark({
          metadata: {
            error:
              "'$.input' is invalid. Please check the API reference: https://platform.openai.com/docs/api-reference.",
          },
        })}
      />,
    );

    expect(
      screen.getByTestId("bookmark-card-error").textContent,
    ).not.toContain("platform.openai.com");
  });
});
