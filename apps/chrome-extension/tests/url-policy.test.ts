import assert from "node:assert/strict";
import test from "node:test";

import {
  getYouTubeVideoId,
  isSameDocumentUrl,
  isSaveableUrl,
  isYouTubeVideoUrl,
  shouldCaptureClientPreview,
  shouldUsePageContext,
} from "../src/url-policy.ts";

const VIDEO_ID = "dQw4w9WgXcQ";

test("isSaveableUrl accepts only bounded HTTP(S) URLs without credentials", () => {
  assert.equal(isSaveableUrl("https://saveit.now/app"), true);
  assert.equal(isSaveableUrl("http://localhost:3000/app"), true);
  assert.equal(isSaveableUrl("javascript:alert(1)"), false);
  assert.equal(isSaveableUrl("file:///etc/passwd"), false);
  assert.equal(isSaveableUrl("https://user:secret@example.com"), false);
  assert.equal(isSaveableUrl(" https://example.com"), false);
  assert.equal(isSaveableUrl({ href: "https://example.com" }), false);
  assert.equal(
    isSaveableUrl(`https://example.com/${"x".repeat(8_192)}`),
    false,
  );
});

test("YouTube matching accepts official video routes", () => {
  const urls = [
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}&feature=share`,
    `https://music.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
    `https://www.youtube.com/live/${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}`,
  ];

  for (const url of urls) {
    assert.equal(isYouTubeVideoUrl(url), true, url);
    assert.equal(getYouTubeVideoId(url), VIDEO_ID, url);
  }
});

test("YouTube matching rejects lookalike hosts and non-video URLs", () => {
  const urls = [
    `https://attacker-youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com.attacker.example/watch?v=${VIDEO_ID}`,
    `https://notyoutube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be.attacker.example/${VIDEO_ID}`,
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    "https://www.youtube.com/",
    "https://www.youtube.com/watch?v=too-short",
    `https://youtu.be/${VIDEO_ID}/unexpected`,
  ];

  for (const url of urls) {
    assert.equal(isYouTubeVideoUrl(url), false, url);
    assert.equal(getYouTubeVideoId(url), null, url);
  }
});

test("same-document matching normalizes URLs and ignores fragments only", () => {
  assert.equal(
    isSameDocumentUrl(
      "https://example.com:443/path?q=1#target",
      "https://example.com/path?q=1#source",
    ),
    true,
  );
  assert.equal(
    isSameDocumentUrl(
      "https://example.com/path?q=1",
      "https://example.com/path?q=2",
    ),
    false,
  );
  assert.equal(
    isSameDocumentUrl("https://example.com/path", "http://example.com/path"),
    false,
  );
  assert.equal(isSameDocumentUrl("not a url", "https://example.com"), false);
});

test("page context is limited to page saves for the current document", () => {
  const sourceUrl = "https://example.com/article#introduction";
  const targetUrl = "https://example.com/article#details";

  assert.equal(shouldUsePageContext("page", targetUrl, sourceUrl), true);
  assert.equal(shouldUsePageContext("link", targetUrl, sourceUrl), false);
  assert.equal(shouldUsePageContext("image", targetUrl, sourceUrl), false);
  assert.equal(
    shouldUsePageContext("page", "https://example.com/other", sourceUrl),
    false,
  );
});

test("client previews skip special pages and non-page targets", () => {
  assert.equal(
    shouldCaptureClientPreview(
      "page",
      "https://example.com/article",
      "https://example.com/article#section",
    ),
    true,
  );

  const skippedUrls = [
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    "https://x.com/saveit/status/123",
    "https://mobile.twitter.com/saveit/status/123",
    "https://example.com/photo.webp?size=large",
    "https://pbs.twimg.com/media/example?format=jpg",
  ];

  for (const url of skippedUrls) {
    assert.equal(shouldCaptureClientPreview("page", url, url), false, url);
  }

  assert.equal(
    shouldCaptureClientPreview(
      "link",
      "https://example.com/article",
      "https://example.com/article",
    ),
    false,
  );
  assert.equal(
    shouldCaptureClientPreview(
      "page",
      "https://attacker-x.com/article",
      "https://attacker-x.com/article",
    ),
    true,
  );
});
