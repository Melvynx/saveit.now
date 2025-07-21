import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookmarksPage } from "../app/app/bookmarks-page.tsx";
import { useBookmarks } from "../app/app/use-bookmarks.js";
import { useSession } from "../src/lib/auth-client.js";

vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
}));

vi.mock("../app/app/use-bookmarks", () => ({
  useBookmarks: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  redirect: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockUseSession = useSession as any;
const mockUseBookmarks = useBookmarks as any;
const mockUseRouter = useRouter as any;

describe("BookmarksPage", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    mockUseBookmarks.mockReturnValue({
      bookmarks: [],
      isPending: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      query: "",
    });

    vi.clearAllMocks();
  });

  it("should always show search bar and header when session is pending", async () => {
    mockUseSession.mockReturnValue({
      isPending: true,
      data: null,
    });

    render(<BookmarksPage />);

    expect(screen.getByText("SaveIt")).toBeInTheDocument();

    const searchInput = screen.getByRole("combobox");
    expect(searchInput).toBeInTheDocument();
  });

  it("should immediately redirect when user is not authenticated", async () => {
    mockUseSession.mockReturnValue({
      isPending: false,
      data: null,
    });

    render(<BookmarksPage />);

    expect(toast.error).toHaveBeenCalledWith(
      "You need to be logged in to access this page",
    );
    expect(mockPush).toHaveBeenCalledWith("/signin");
  });

  it("should show skeleton loading cards when session is pending", () => {
    mockUseSession.mockReturnValue({
      isPending: true,
      data: null,
    });

    render(<BookmarksPage />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should not render content when not authenticated", () => {
    mockUseSession.mockReturnValue({
      isPending: false,
      data: null,
    });

    const { container } = render(<BookmarksPage />);

    // Component should return null and not render anything
    expect(container.firstChild).toBeNull();
  });

  it("should redirect to /start when user is authenticated but onboarding is incomplete", async () => {
    mockUseSession.mockReturnValue({
      isPending: false,
      data: {
        session: { id: "session-1" },
        user: { onboarding: false },
      },
    });

    render(<BookmarksPage />);

    await waitFor(() => {
      expect(require("next/navigation").redirect).toHaveBeenCalledWith(
        "/start",
      );
    });
  });

  it("should show actual content when user is authenticated and onboarding is complete", () => {
    const mockBookmarks = [
      { id: "1", title: "Test Bookmark", url: "https://example.com" },
    ];

    mockUseSession.mockReturnValue({
      isPending: false,
      data: {
        session: { id: "session-1" },
        user: { onboarding: true },
      },
    });

    mockUseBookmarks.mockReturnValue({
      bookmarks: mockBookmarks,
      isPending: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      query: "",
    });

    render(<BookmarksPage />);

    expect(screen.getByText("SaveIt")).toBeInTheDocument();

    const searchInput = screen.getByRole("combobox");
    expect(searchInput).toBeInTheDocument();

    expect(toast.error).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should show skeleton loading cards when bookmarks are pending even if authenticated", () => {
    mockUseSession.mockReturnValue({
      isPending: false,
      data: {
        session: { id: "session-1" },
        user: { onboarding: true },
      },
    });

    mockUseBookmarks.mockReturnValue({
      bookmarks: [],
      isPending: true,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      query: "",
    });

    render(<BookmarksPage />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
