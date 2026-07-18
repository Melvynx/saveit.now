import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_BOOKMARK_ID_LENGTH,
  MAX_METADATA_ARRAY_LENGTH,
  MAX_SCREENSHOT_DATA_URL_LENGTH,
  MAX_TRANSCRIPT_LENGTH,
  MAX_URL_LENGTH,
  isRetryableUploadError,
  parseRuntimeRequest,
  parseTabSaveMessage,
} from "../src/protocol.ts";

const PNG_DATA_URL = "data:image/png;base64,AA==";
const JPEG_DATA_URL = "data:image/jpeg;base64,AQID";

test("rejects non-record and prototype-backed runtime messages", () => {
  class RuntimeMessage {
    type = "GET_SESSION";
  }

  const inherited = Object.create({ type: "GET_SESSION" });

  for (const value of [
    null,
    undefined,
    "GET_SESSION",
    1,
    [],
    new Date(),
    new RuntimeMessage(),
    inherited,
  ]) {
    assert.equal(parseRuntimeRequest(value), null);
  }
});

test("rejects accessor-backed message fields without invoking them", () => {
  let invoked = false;
  const message = Object.defineProperty({}, "type", {
    enumerable: true,
    get() {
      invoked = true;
      return "GET_SESSION";
    },
  });

  assert.equal(parseRuntimeRequest(message), null);
  assert.equal(invoked, false);
});

test("parses every runtime request variant into a normalized record", () => {
  assert.deepEqual(parseRuntimeRequest({ type: "GET_SESSION", extra: true }), {
    type: "GET_SESSION",
  });
  assert.deepEqual(
    parseRuntimeRequest({
      type: "CAPTURE_SCREENSHOT",
      expectedPageUrl: "https://example.com/current",
    }),
    {
      type: "CAPTURE_SCREENSHOT",
      expectedPageUrl: "https://example.com/current",
    },
  );

  for (const suffix of ["page", "link", "image"] as const) {
    assert.deepEqual(
      parseRuntimeRequest({
        type: "SAVE_BOOKMARK",
        url: `https://example.com/${suffix}`,
        transcript: "A useful transcript",
        metadata: {
          youtubeTranscript: {
            source: "captions",
            languages: ["en", "fr"],
          },
        },
      }),
      {
        type: "SAVE_BOOKMARK",
        url: `https://example.com/${suffix}`,
        transcript: "A useful transcript",
        metadata: {
          youtubeTranscript: {
            source: "captions",
            languages: ["en", "fr"],
          },
        },
      },
    );
  }

  assert.deepEqual(
    parseRuntimeRequest({
      type: "UPLOAD_SCREENSHOT",
      bookmarkId: "bookmark-id",
      screenshotDataUrl: PNG_DATA_URL,
    }),
    {
      type: "UPLOAD_SCREENSHOT",
      bookmarkId: "bookmark-id",
      screenshotDataUrl: PNG_DATA_URL,
    },
  );
  assert.deepEqual(
    parseRuntimeRequest({
      type: "UPLOAD_SCREENSHOT",
      bookmarkId: "bookmark-id",
      screenshotDataUrl: JPEG_DATA_URL,
    }),
    {
      type: "UPLOAD_SCREENSHOT",
      bookmarkId: "bookmark-id",
      screenshotDataUrl: JPEG_DATA_URL,
    },
  );

  for (const path of ["/app", "/signin", "/upgrade"] as const) {
    assert.deepEqual(parseRuntimeRequest({ type: "OPEN_SAVEIT", path }), {
      type: "OPEN_SAVEIT",
      path,
    });
  }
});

test("rejects unknown requests and invalid URL fields", () => {
  for (const value of [
    {},
    { type: "UNKNOWN" },
    { type: "CAPTURE_SCREENSHOT" },
    { type: "SAVE_BOOKMARK", url: "" },
    { type: "SAVE_BOOKMARK", url: "   " },
    {
      type: "SAVE_BOOKMARK",
      url: "x".repeat(MAX_URL_LENGTH + 1),
    },
  ]) {
    assert.equal(parseRuntimeRequest(value), null);
  }
});

test("enforces transcript and metadata bounds and shapes", () => {
  const baseRequest = {
    type: "SAVE_BOOKMARK",
    url: "https://example.com",
  };

  assert.equal(
    parseRuntimeRequest({
      ...baseRequest,
      transcript: "x".repeat(MAX_TRANSCRIPT_LENGTH + 1),
    }),
    null,
  );

  for (const metadata of [
    null,
    [],
    new Date(),
    { values: new Array(MAX_METADATA_ARRAY_LENGTH + 1).fill("x") },
    { value: Number.POSITIVE_INFINITY },
    JSON.parse('{"__proto__":{"polluted":true}}'),
  ]) {
    assert.equal(parseRuntimeRequest({ ...baseRequest, metadata }), null);
  }

  const cyclicMetadata: Record<string, unknown> = {};
  cyclicMetadata.self = cyclicMetadata;
  assert.equal(
    parseRuntimeRequest({ ...baseRequest, metadata: cyclicMetadata }),
    null,
  );
});

test("rejects malformed or oversized screenshot upload requests", () => {
  const validBase = {
    type: "UPLOAD_SCREENSHOT",
    bookmarkId: "bookmark-id",
  };

  for (const value of [
    { ...validBase, bookmarkId: "", screenshotDataUrl: PNG_DATA_URL },
    {
      ...validBase,
      bookmarkId: "x".repeat(MAX_BOOKMARK_ID_LENGTH + 1),
      screenshotDataUrl: PNG_DATA_URL,
    },
    { ...validBase, screenshotDataUrl: "data:image/gif;base64,AA==" },
    { ...validBase, screenshotDataUrl: "data:image/jpg;base64,AA==" },
    { ...validBase, screenshotDataUrl: "data:image/png,AA==" },
    { ...validBase, screenshotDataUrl: "data:image/png;base64,not base64" },
    {
      ...validBase,
      screenshotDataUrl: `data:image/png;base64,${"A".repeat(
        MAX_SCREENSHOT_DATA_URL_LENGTH,
      )}`,
    },
  ]) {
    assert.equal(parseRuntimeRequest(value), null);
  }
});

test("only allows known SaveIt destinations", () => {
  for (const path of [
    "/",
    "/admin",
    "/app?redirect=evil",
    "https://evil.test",
  ]) {
    assert.equal(parseRuntimeRequest({ type: "OPEN_SAVEIT", path }), null);
  }
  assert.equal(
    parseRuntimeRequest({ type: "OPEN_SAVEIT", path: { toString: "/app" } }),
    null,
  );
});

test("parses tab save messages and only uses a fallback for a missing URL", () => {
  for (const type of ["page", "link", "image"] as const) {
    assert.deepEqual(
      parseTabSaveMessage({
        action: "saveBookmark",
        type,
        url: `https://example.com/${type}`,
      }),
      {
        action: "saveBookmark",
        type,
        url: `https://example.com/${type}`,
      },
    );
  }

  assert.deepEqual(
    parseTabSaveMessage(
      { action: "saveBookmark", type: "page" },
      "https://fallback.example",
    ),
    {
      action: "saveBookmark",
      type: "page",
      url: "https://fallback.example",
    },
  );
  assert.equal(
    parseTabSaveMessage(
      { action: "saveBookmark", type: "page", url: "" },
      "https://fallback.example",
    ),
    null,
  );

  for (const value of [
    null,
    [],
    { action: "showSaveUI", type: "page", url: "https://example.com" },
    { action: "saveBookmark", type: "video", url: "https://example.com" },
    { action: "saveBookmark", type: "page" },
  ]) {
    assert.equal(parseTabSaveMessage(value), null);
  }
});

test("classifies only transient upload failures as retryable", () => {
  assert.equal(isRetryableUploadError("NETWORK_ERROR"), true);
  assert.equal(isRetryableUploadError("RATE_LIMITED"), true);
  assert.equal(isRetryableUploadError("SERVER_ERROR"), true);
  assert.equal(isRetryableUploadError("AUTH_REQUIRED"), false);
  assert.equal(isRetryableUploadError("FILE_TOO_LARGE"), false);
  assert.equal(isRetryableUploadError("INVALID_FILE"), false);
  assert.equal(isRetryableUploadError("NOT_FOUND"), false);
  assert.equal(isRetryableUploadError("UNKNOWN"), false);
});
