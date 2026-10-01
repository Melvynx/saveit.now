export class ApplicationError extends Error {
  type: string;
  constructor(message: string, type?: string) {
    super(message);
    this.name = "ApplicationError";
    this.type = type ?? "ApplicationError";
  }
}

export class SafeActionError extends ApplicationError {
  constructor(message: string) {
    super(message, "SafeActionError");
    this.name = "SafeActionError";
  }
}

export class SafeRouteError extends ApplicationError {
  status: number;
  constructor(message: string, status = 400) {
    super(message, "SafeRouteError");
    this.name = "SafeRouteError";
    this.status = status;
  }
}

/**
 * User-facing message for a failed Convex call (or any thrown value).
 * A ConvexError's `.message` is the full "[CONVEX M(fn)] [Request ID: …]
 * Server Error Uncaught ConvexError: {json}" trace; the readable text lives in
 * `.data.message`. Non-ConvexError server failures are internal: show the
 * fallback instead of their trace.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.name === "ConvexError") {
    const data = (error as Error & { data?: unknown }).data;
    if (typeof data === "string" && data.trim()) return data;
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return data.message;
    }
    return fallback;
  }
  if (error instanceof Error) {
    if (/\[CONVEX |\[Request ID: |Server Error/.test(error.message)) {
      return fallback;
    }
    return error.message || fallback;
  }
  return fallback;
}

// Types

export const BookmarkErrorType = {
  MAX_BOOKMARKS: "MAX_BOOKMARKS",
  BOOKMARK_ALREADY_EXISTS: "BOOKMARK_ALREADY_EXISTS",
} as const;
