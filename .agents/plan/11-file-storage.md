# Phase 11 — File Storage (R2) + Cloudflare Actions

**Goal:** keep Cloudflare R2 for blob storage (uploads from Convex actions) and fold the retired
`apps/worker` (screenshots / YouTube / PDF) into Convex Node actions calling Cloudflare APIs directly.

**Current logic to port:** `apps/web/src/lib/aws-s3/*`, `apps/web/src/lib/cloudflare/screenshot.ts`,
`apps/web/src/lib/youtube/*`, `apps/worker/src/index.ts`.

**Decision:** call the Cloudflare Browser Rendering REST API **inside Convex actions** (per product
owner). Retire the standalone worker.

**Depends on:** Phase 01 (deps: `@aws-sdk/client-s3`, `sharp`, transcript lib).

---

## R2 storage — `convex/files/actions.ts` (`"use node"`)
Port `aws-s3-*`:
- `uploadBuffer({ buffer|base64, key, contentType })` → `PutObjectCommand` to the R2 bucket via the
  `S3Client` (`region: "auto"`, `endpoint: AWS_ENDPOINT`). Return the public CDN URL
  `${R2_URL}/${key}`.
- Path convention unchanged: `users/{userId}/bookmarks/{bookmarkId}/{filename}` — so migrated URLs stay
  valid.
- `deleteObjects({ keys })` for bookmark deletion cleanup (called from `bookmarks.mutations.remove`).
- `uploadUserImage` / `uploadBookmarkScreenshot` (authAction) for direct user/extension uploads
  (replaces `api.bookmarks.$bookmarkId.upload-screenshot.ts`). **SECURITY (Phase 17 B3): port the current
  guards — reject before writing to R2 if size > `2 * 1024 * 1024` (2MB) or MIME not in
  `[image/jpeg, image/jpg, image/png, image/webp, image/gif]`.** Also assert bookmark ownership.

Env (backend): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_ENDPOINT`, `R2_URL`.

## Cloudflare Browser Rendering — `convex/processing/screenshot.ts` (`"use node"`)
Port `cloudflare/screenshot.ts` and the worker's screenshot/PDF logic:
- `captureScreenshot(url)` → `POST https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`
  with `Authorization: Bearer ${CLOUDFLARE_API_TOKEN}`, viewport 1920x1080, `networkidle0`, 30s timeout.
  Returns image bytes → upload to R2 via `files/actions` → store URL on the bookmark.
- `capturePdfScreenshot(url)` — the worker's PDF rendering path (modified URL / PDF viewer). Port the
  same approach using Browser Rendering.

## YouTube — `convex/processing/youtube.ts` (`"use node"`)
- oEmbed metadata fetch (`https://www.youtube.com/oembed?...`).
- Transcript via `@danielxceron/youtube-transcript` (the web app already used this lib directly, not the
  worker). If a transcript was supplied by the extension (`create` arg), use it and skip fetching.

## Retire the worker
- Remove `apps/worker` from the build (Phase 15). Delete `SCREENSHOT_WORKER_URL` usage.
- If any flow still needs Puppeteer features beyond Browser Rendering, note it; otherwise Browser
  Rendering covers screenshots + PDF.

## Acceptance criteria
- Screenshots/og-images/favicons/PDFs upload to R2 and render via the existing CDN URLs.
- The processing pipeline (Phase 06) gets previews from Convex Cloudflare actions — no separate worker.
- Bookmark deletion removes its R2 objects.

## Risks
- Cloudflare Browser Rendering has account rate/concurrency limits; add retries + handle 429s in the
  action. The pipeline should degrade gracefully (bookmark still READY without a preview).
- Large PDFs/images: stream to R2, keep only URLs in `metadata`; never store blobs in Convex docs.
- `sharp` native binary must build in the Convex deploy environment — verify on first `convex deploy`.
