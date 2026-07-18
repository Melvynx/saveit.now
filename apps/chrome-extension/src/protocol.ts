import {
  isSaveType,
  MAX_TRANSCRIPT_LENGTH,
  MAX_URL_LENGTH,
  type SaveType,
} from "./domain.ts";

export { MAX_TRANSCRIPT_LENGTH, MAX_URL_LENGTH, type SaveType };

export const MAX_BOOKMARK_ID_LENGTH = 256;
export const MAX_SCREENSHOT_DATA_URL_LENGTH = 3_000_000;
export const MAX_METADATA_DEPTH = 6;
export const MAX_METADATA_ENTRIES = 256;
export const MAX_METADATA_ARRAY_LENGTH = 128;
export const MAX_METADATA_KEY_LENGTH = 128;
export const MAX_METADATA_STRING_LENGTH = 16_384;

export type Session = {
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export type SessionResult =
  | {
      session: Session;
      error?: never;
      errorType?: never;
    }
  | {
      session: null;
      error?: string;
      errorType: "AUTH_REQUIRED" | "NETWORK_ERROR";
    };

export type SaveErrorType =
  | "AUTH_REQUIRED"
  | "BOOKMARK_ALREADY_EXISTS"
  | "MAX_BOOKMARKS"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN";

export type SaveBookmarkResult =
  | {
      success: true;
      bookmarkId: string;
    }
  | {
      success: false;
      error: string;
      errorType: SaveErrorType;
    };

export type UploadErrorType =
  | "AUTH_REQUIRED"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE"
  | "NETWORK_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN";

export type UploadResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
      errorType: UploadErrorType;
    };

export type CaptureResult =
  | {
      success: true;
      screenshotDataUrl: string;
    }
  | {
      success: false;
      error: string;
      errorType: "CAPTURE_FAILED" | "NO_ACTIVE_TAB" | "TAB_CHANGED";
    };

export type OpenSaveItPath = "/app" | "/signin" | "/upgrade";

export type OpenSaveItResult =
  | { success: true }
  | { success: false; error: string; errorType: "UNKNOWN" };

export type TabSaveMessage = {
  action: "saveBookmark";
  type: SaveType;
  url: string;
};

type SaveBookmarkRequest = {
  type: "SAVE_BOOKMARK";
  url: string;
  transcript?: string;
  metadata?: Record<string, unknown>;
};

export type RuntimeRequestMap = {
  GET_SESSION: { type: "GET_SESSION" };
  SAVE_BOOKMARK: SaveBookmarkRequest;
  CAPTURE_SCREENSHOT: {
    type: "CAPTURE_SCREENSHOT";
    expectedPageUrl: string;
  };
  UPLOAD_SCREENSHOT: {
    type: "UPLOAD_SCREENSHOT";
    bookmarkId: string;
    screenshotDataUrl: string;
  };
  OPEN_SAVEIT: {
    type: "OPEN_SAVEIT";
    path: OpenSaveItPath;
  };
};

export type RuntimeResponseMap = {
  GET_SESSION: SessionResult;
  SAVE_BOOKMARK: SaveBookmarkResult;
  CAPTURE_SCREENSHOT: CaptureResult;
  UPLOAD_SCREENSHOT: UploadResult;
  OPEN_SAVEIT: OpenSaveItResult;
};

export type RuntimeRequestType = keyof RuntimeRequestMap;
export type RuntimeRequestFor<T extends RuntimeRequestType> =
  RuntimeRequestMap[T];
export type RuntimeResponseFor<T extends RuntimeRequestType> =
  RuntimeResponseMap[T];
export type RuntimeRequest = RuntimeRequestMap[RuntimeRequestType];
export type RuntimeResponse = RuntimeResponseMap[RuntimeRequestType];
export type RuntimeResponseForRequest<T extends RuntimeRequest> =
  RuntimeResponseMap[T["type"]];

function asPlainRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;

  return value as Record<string, unknown>;
}

function readOwnDataProperty(
  record: Record<string, unknown>,
  key: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) return undefined;
  if (!("value" in descriptor)) {
    throw new TypeError(`Accessor property ${key} is not allowed`);
  }
  return descriptor.value;
}

function isBoundedNonEmptyString(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength &&
    value.trim().length > 0
  );
}

function isOpenSaveItPath(value: unknown): value is OpenSaveItPath {
  return value === "/app" || value === "/signin" || value === "/upgrade";
}

function hasSafeMetadataKey(key: string): boolean {
  return (
    key.length > 0 &&
    key.length <= MAX_METADATA_KEY_LENGTH &&
    key !== "__proto__" &&
    key !== "constructor" &&
    key !== "prototype"
  );
}

type MetadataBudget = {
  entries: number;
  seen: WeakSet<object>;
};

function isSafeMetadataValue(
  value: unknown,
  depth: number,
  budget: MetadataBudget,
): boolean {
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") {
    return value.length <= MAX_METADATA_STRING_LENGTH;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || depth > MAX_METADATA_DEPTH) return false;

  if (budget.seen.has(value)) return false;
  budget.seen.add(value);

  if (Array.isArray(value)) {
    if (value.length > MAX_METADATA_ARRAY_LENGTH) return false;

    for (const entry of value) {
      budget.entries += 1;
      if (
        budget.entries > MAX_METADATA_ENTRIES ||
        !isSafeMetadataValue(entry, depth + 1, budget)
      ) {
        return false;
      }
    }
    return true;
  }

  const record = asPlainRecord(value);
  if (!record) return false;

  for (const key of Object.keys(record)) {
    budget.entries += 1;
    if (
      budget.entries > MAX_METADATA_ENTRIES ||
      !hasSafeMetadataKey(key) ||
      !isSafeMetadataValue(readOwnDataProperty(record, key), depth + 1, budget)
    ) {
      return false;
    }
  }

  return true;
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  const metadata = asPlainRecord(value);
  if (!metadata) return null;

  return isSafeMetadataValue(metadata, 0, {
    entries: 0,
    seen: new WeakSet<object>(),
  })
    ? metadata
    : null;
}

function isScreenshotDataUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length > MAX_SCREENSHOT_DATA_URL_LENGTH
  ) {
    return false;
  }

  const match =
    /^data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  return Boolean(match?.[1] && match[1].length % 4 === 0);
}

export function parseRuntimeRequest(value: unknown): RuntimeRequest | null {
  try {
    const record = asPlainRecord(value);
    if (!record) return null;

    const type = readOwnDataProperty(record, "type");
    if (type === "GET_SESSION") return { type };
    if (type === "CAPTURE_SCREENSHOT") {
      const expectedPageUrl = readOwnDataProperty(record, "expectedPageUrl");
      return isBoundedNonEmptyString(expectedPageUrl, MAX_URL_LENGTH)
        ? { type, expectedPageUrl }
        : null;
    }

    if (type === "SAVE_BOOKMARK") {
      const url = readOwnDataProperty(record, "url");
      const transcript = readOwnDataProperty(record, "transcript");
      const metadataValue = readOwnDataProperty(record, "metadata");

      if (!isBoundedNonEmptyString(url, MAX_URL_LENGTH)) return null;
      if (
        transcript !== undefined &&
        (typeof transcript !== "string" ||
          transcript.length > MAX_TRANSCRIPT_LENGTH)
      ) {
        return null;
      }

      const metadata =
        metadataValue === undefined ? undefined : parseMetadata(metadataValue);
      if (metadataValue !== undefined && metadata === null) return null;

      const request: SaveBookmarkRequest = { type, url };
      if (transcript !== undefined) request.transcript = transcript;
      if (metadata !== undefined && metadata !== null) {
        request.metadata = metadata;
      }
      return request;
    }

    if (type === "UPLOAD_SCREENSHOT") {
      const bookmarkId = readOwnDataProperty(record, "bookmarkId");
      const screenshotDataUrl = readOwnDataProperty(
        record,
        "screenshotDataUrl",
      );
      if (
        !isBoundedNonEmptyString(bookmarkId, MAX_BOOKMARK_ID_LENGTH) ||
        !isScreenshotDataUrl(screenshotDataUrl)
      ) {
        return null;
      }
      return { type, bookmarkId, screenshotDataUrl };
    }

    if (type === "OPEN_SAVEIT") {
      const path = readOwnDataProperty(record, "path");
      return isOpenSaveItPath(path) ? { type, path } : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function parseTabSaveMessage(
  value: unknown,
  fallbackUrl?: string,
): TabSaveMessage | null {
  try {
    const record = asPlainRecord(value);
    if (!record || readOwnDataProperty(record, "action") !== "saveBookmark") {
      return null;
    }

    const type = readOwnDataProperty(record, "type");
    const messageUrl = readOwnDataProperty(record, "url");
    const url = messageUrl === undefined ? fallbackUrl : messageUrl;
    if (!isSaveType(type) || !isBoundedNonEmptyString(url, MAX_URL_LENGTH)) {
      return null;
    }

    return { action: "saveBookmark", type, url };
  } catch {
    return null;
  }
}

export function isRetryableUploadError(errorType: UploadErrorType): boolean {
  return (
    errorType === "NETWORK_ERROR" ||
    errorType === "RATE_LIMITED" ||
    errorType === "SERVER_ERROR"
  );
}
