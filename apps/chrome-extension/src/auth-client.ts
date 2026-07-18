import { createAuthClient } from "better-auth/client";

import { config } from "./config";
import type {
  SaveBookmarkResult,
  SaveErrorType,
  Session,
  SessionResult,
  UploadErrorType,
  UploadResult,
} from "./protocol";

const BASE_URL = config.BASE_URL;
const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;
const SUPPORTED_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png"]);
const SESSION_TIMEOUT_MS = 10_000;
const API_TIMEOUT_MS = 25_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const abortFromUpstream = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abortFromUpstream();
  init.signal?.addEventListener("abort", abortFromUpstream, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abortFromUpstream);
  }
}

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: {
    customFetchImpl: (input, init) =>
      fetchWithTimeout(input, init, SESSION_TIMEOUT_MS),
    credentials: "include",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  },
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseSession(value: unknown): Session | null {
  const data = asRecord(value);
  const user = asRecord(data?.user);
  if (typeof user?.id !== "string" || typeof user.email !== "string") {
    return null;
  }

  const session: Session = {
    user: { id: user.id, email: user.email },
  };
  if (typeof user.name === "string") session.user.name = user.name;
  return session;
}

function isAuthenticationError(error: unknown): boolean {
  const candidate = asRecord(error);
  return (
    candidate?.status === 401 ||
    candidate?.statusCode === 401 ||
    candidate?.code === "UNAUTHORIZED"
  );
}

export async function getSessionResult(): Promise<SessionResult> {
  try {
    const { data, error } = await authClient.getSession();
    if (error) {
      if (isAuthenticationError(error)) {
        return { session: null, errorType: "AUTH_REQUIRED" };
      }
      return {
        session: null,
        error: "SaveIt is unreachable. Check your connection and try again.",
        errorType: "NETWORK_ERROR",
      };
    }

    const session = parseSession(data);
    return session
      ? { session }
      : { session: null, errorType: "AUTH_REQUIRED" };
  } catch {
    return {
      session: null,
      error: "SaveIt is unreachable. Check your connection and try again.",
      errorType: "NETWORK_ERROR",
    };
  }
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = asRecord(await response.json());
    return typeof payload?.error === "string"
      ? payload.error
      : typeof payload?.message === "string"
        ? payload.message
        : fallback;
  } catch {
    return fallback;
  }
}

function classifySaveError(response: Response, message: string): SaveErrorType {
  const normalizedMessage = message.toLowerCase();
  if (response.status === 401) return "AUTH_REQUIRED";
  if (response.status === 429) return "RATE_LIMITED";
  if (response.status >= 500) return "SERVER_ERROR";
  if (normalizedMessage.includes("already exists")) {
    return "BOOKMARK_ALREADY_EXISTS";
  }
  if (normalizedMessage.includes("maximum number of bookmarks")) {
    return "MAX_BOOKMARKS";
  }
  return "UNKNOWN";
}

function classifyUploadError(
  response: Response,
  message: string,
): UploadErrorType {
  const normalizedMessage = message.toLowerCase();
  if (response.status === 401) return "AUTH_REQUIRED";
  if (response.status === 404) return "NOT_FOUND";
  if (response.status === 413 || normalizedMessage.includes("less than 2mb")) {
    return "FILE_TOO_LARGE";
  }
  if (
    response.status === 400 &&
    (normalizedMessage.includes("image files") ||
      normalizedMessage.includes("no file"))
  ) {
    return "INVALID_FILE";
  }
  if (response.status === 429) return "RATE_LIMITED";
  if (response.status >= 500) return "SERVER_ERROR";
  return "UNKNOWN";
}

export async function saveBookmark(
  url: string,
  transcript?: string,
  metadata?: Record<string, unknown>,
): Promise<SaveBookmarkResult> {
  const requestBody: {
    url: string;
    transcript?: string;
    metadata?: Record<string, unknown>;
  } = { url };
  if (transcript) requestBody.transcript = transcript;
  if (metadata) requestBody.metadata = metadata;

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/bookmarks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await readErrorMessage(response, "Failed to save bookmark");
      return {
        success: false,
        error,
        errorType: classifySaveError(response, error),
      };
    }

    const responseData = asRecord(await response.json());
    const bookmark = asRecord(responseData?.bookmark);
    if (typeof bookmark?.id !== "string" || bookmark.id.length === 0) {
      return {
        success: false,
        error: "SaveIt returned an incomplete bookmark response.",
        errorType: "SERVER_ERROR",
      };
    }

    return { success: true, bookmarkId: bookmark.id };
  } catch {
    return {
      success: false,
      error: "Network error. Check your connection and try again.",
      errorType: "NETWORK_ERROR",
    };
  }
}

export async function uploadScreenshot(
  bookmarkId: string,
  screenshotBlob: Blob,
): Promise<UploadResult> {
  if (screenshotBlob.size > MAX_SCREENSHOT_BYTES) {
    return {
      success: false,
      error: "The preview is larger than SaveIt's 2 MB upload limit.",
      errorType: "FILE_TOO_LARGE",
    };
  }
  if (!SUPPORTED_SCREENSHOT_TYPES.has(screenshotBlob.type)) {
    return {
      success: false,
      error: "The preview is not a supported PNG or JPEG image.",
      errorType: "INVALID_FILE",
    };
  }

  const formData = new FormData();
  const fileName =
    screenshotBlob.type === "image/jpeg" ? "screenshot.jpg" : "screenshot.png";
  formData.append("file", screenshotBlob, fileName);

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/api/bookmarks/${encodeURIComponent(bookmarkId)}/upload-screenshot`,
      {
        method: "POST",
        credentials: "include",
        mode: "cors",
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await readErrorMessage(
        response,
        "Failed to upload screenshot",
      );
      return {
        success: false,
        error,
        errorType: classifyUploadError(response, error),
      };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Network error while uploading the screenshot.",
      errorType: "NETWORK_ERROR",
    };
  }
}
