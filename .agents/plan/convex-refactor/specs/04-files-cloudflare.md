# Porting Spec 04 — File Storage (R2) + Cloudflare Actions

**Phase reference:** Phase 11 (`11-file-storage.md`)
**Target Convex files:**
- `packages/backend/convex/files/actions.ts` — R2 upload/delete (`"use node"`)
- `packages/backend/convex/processing/screenshot.ts` — Cloudflare Browser Rendering screenshots (`"use node"`)

---

## 1. Current source files and exact responsibilities

### 1.1 `apps/web/src/lib/aws-s3/aws-s3-client.ts`

Creates and exports a singleton `S3Client` instance (`s3`) configured for Cloudflare R2.

Config:
```ts
new S3Client({
  region: "auto",
  endpoint: env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
```

- `region: "auto"` is **mandatory** for R2; do NOT change to a real AWS region.
- `endpoint` is the Cloudflare R2 S3-compatible endpoint URL (e.g. `https://<accountid>.r2.cloudflarestorage.com`).
- The bucket name is read from `process.env.AWS_S3_BUCKET_NAME` at call time (not baked into the client).

### 1.2 `apps/web/src/lib/aws-s3/aws-s3-upload-files.ts`

Three upload functions, all returning the **public CDN URL** `${R2_URL}/${key}` on success.

#### `uploadFileToS3({ file, prefix, contentType?, fileName? }): Promise<string | undefined>`
- Accepts a Web `File` object.
- Key construction: `` `${prefix}/${fileName}.${fileExtension}` `` where `fileExtension` comes from `file.name.split(".").pop()`.
- Converts file to `Buffer` via `arrayBuffer()`.
- Sends `PutObjectCommand({ Bucket, Key, Body, ContentType })`.
- On S3 send error: logs `"Invalid s3 client send"` and returns `undefined` (no throw).
- Returns `${env.R2_URL}/${uniqueFileName}` on success.

#### `uploadBufferToS3({ buffer, prefix, fileName, contentType }): Promise<string | null>`
- Accepts a raw `Buffer`.
- Extension is derived from `mime.extension(contentType) || "bin"` (uses the `mime-types` npm package).
- Key: `` `${prefix}/${fileName}.${fileExtension}` ``
- On error: logs and returns `null`.
- Returns CDN URL string on success.

#### `uploadFileFromURLToS3({ url, prefix, fileName }): Promise<string | null>`
- **CI bypass**: if `env.CI === true`, immediately returns `"https://placehold.co/500x500"` without any network call.
- Fetches the URL; on non-OK response logs error and returns `null`.
- Reads `Content-Type` from response header, falls back to `"application/octet-stream"`.
- Extension via `mime.extension(contentType) || "bin"`.
- Key: `` `${prefix}/${fileName}.${fileExtension}` ``
- Uploads with `PutObjectCommand`.
- Returns CDN URL or `null`.

### 1.3 `apps/web/src/lib/aws-s3/aws-s3-delete-files.ts`

#### `deleteFileFromS3({ key }): Promise<void>`
- Sends `DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key })`.
- No return value; errors propagate.

### 1.4 `apps/web/src/lib/cloudflare/screenshot.ts`

Two functions that call the **Cloudflare Browser Rendering REST API**.

#### `captureScreenshot(options: ScreenshotOptions): Promise<Buffer>`
Options shape:
```ts
interface ScreenshotOptions {
  url: string;
  viewport?: { width: number; height: number };
  waitUntil?: "load" | "networkidle0" | "networkidle2";
  timeout?: number;
  fullPage?: boolean;
}
```
HTTP call:
- Method: `POST`
- Endpoint: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`
- Headers: `Authorization: Bearer ${CLOUDFLARE_API_TOKEN}`, `Content-Type: application/json`
- Body (JSON):
```json
{
  "url": "<options.url>",
  "gotoOptions": {
    "waitUntil": "networkidle0",
    "timeout": 30000
  },
  "viewport": { "width": 1920, "height": 1080 },
  "screenshotOptions": {
    "fullPage": false,
    "type": "png"
  }
}
```
Defaults (applied when not provided):
- `waitUntil`: `"networkidle0"`
- `timeout`: `30000` (30 seconds)
- `viewport`: `{ width: 1920, height: 1080 }`
- `fullPage`: `false`

On non-OK response: reads response text, throws `Error("Screenshot failed (${status}): ${errorText || statusText}")`.

On success: reads `arrayBuffer()` and returns `Buffer.from(arrayBuffer)`.

#### `capturePDFScreenshot(url: string): Promise<Buffer>`
- Modifies the URL by appending `#toolbar=0&navpanes=0&scrollbar=0&view=FitH`.
- Delegates to `captureScreenshot` with:
  - `viewport: { width: 1920, height: 1080 }`
  - `waitUntil: "networkidle0"`
  - `timeout: 30000`

Note: The `capturePDFScreenshot` approach via the Cloudflare Browser Rendering API (using the modified URL with hash params) is **simpler** than the Puppeteer-based worker approach. The worker's PDF path used PDF.js in a `data:text/html` page with complex JS — the Cloudflare API approach just appends the hash params and renders the URL directly.

### 1.5 `apps/worker/src/index.ts` — Cloudflare Worker (to be retired)

The worker handled three routes: `/` (screenshot), `/pdf`, `/youtube`. All are being folded into Convex actions.

**Environment bindings** (not available in Convex — irrelevant after retirement):
- `MYBROWSER: Fetcher` — Cloudflare Browser AI binding
- `SAVEIT_KV: KVNamespace` — KV for caching
- `BROWSER: Fetcher`

#### `/` → `handleScreenshot`
- Query param: `?url=`
- Viewport: `1280 * QUALITY` x `720 * QUALITY` where `QUALITY = 1` → effectively 1280x720.
- KV caching: checks `SAVEIT_KV.get(url, { type: "arrayBuffer" })` before launching browser. On cache miss: screenshots and stores with `expirationTtl: 60 * 60 * 24`.
- JS injected to hide scrollbar: sets `html.overflow = "hidden"` and injects `<style>::-webkit-scrollbar { display: none; }</style>` via `createElement`.
- `waitUntil: "networkidle0"`, `timeout: 15000`.
- Returns `image/jpeg`.
- **NOTE**: The Convex migration uses the Cloudflare Browser Rendering REST API instead of Puppeteer (no KV caching in Convex). The viewport and waitUntil differ slightly — the web app's `screenshot.ts` (1920x1080, 30s) is the authoritative version to port.

#### `/pdf` → `handlePDF`
- Query param: `?url=`
- Validates URL (400 if missing or invalid).
- Renders PDF using PDF.js in a `data:text/html` page injected into Puppeteer:
  - PDF.js from CDN: `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js`
  - Worker: `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`
  - Renders page 1 at scale `1.5`.
  - Viewport: 1280x720.
  - Waits for `window.pdfLoaded === true || window.pdfError === true`.
- Takes JPEG screenshot at `quality: 80`.
- **NOTE**: In Convex, use `capturePDFScreenshot` (via Cloudflare Browser Rendering REST API) instead of this Puppeteer-based approach. The hash-params trick (`#toolbar=0&navpanes=0&scrollbar=0&view=FitH`) is simpler.

#### `/youtube` → `handleYouTube`
- Query param: `?videoId=`
- Fetches oEmbed: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
- Thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
- Transcript: uses `@danielxceron/youtube-transcript` → `YoutubeTranscript.fetchTranscript(videoId)`.
  - Format: each entry formatted as `` `[${formatTime(entry.offset)}] ${entry.text}` `` joined with `\n`.
  - `formatTime(seconds)`: MM:SS — `${Math.floor(seconds/60).toString().padStart(2,"0")}:${Math.floor(seconds%60).toString().padStart(2,"0")}`.
  - Transcript failures are swallowed (continue without transcript).
- KV caching for 24h: `SAVEIT_KV.put(`youtube:${videoId}`, JSON.stringify(metadata), { expirationTtl: 60 * 60 * 24 })`. **Not reproduced in Convex** (no KV binding available; the processing pipeline can skip caching or handle it at the Convex scheduler level).
- Returns JSON: `{ title: string, thumbnail: string, transcript?: string }`.
- On oEmbed failure: 500 `{ error: "Failed to extract YouTube metadata", message: ... }`.
- The comment in the file shows KV caching was previously disabled. Leave YouTube caching out of the Convex port.

### 1.6 `apps/web/src/routes/api.bookmarks.$bookmarkId.upload-screenshot.ts`

**TanStack Start POST route**: `POST /api/bookmarks/:bookmarkId/upload-screenshot`

Security and validation guards (Phase 17 B3 — all must be ported to the Convex `uploadBookmarkScreenshot` action):

1. `requireUser(request)` — authenticated user required (401/redirect if not).
2. `getUserBookmark(params.bookmarkId, user.id)` — **ownership check**: bookmark must exist AND belong to the calling user. Returns 404 if not found.
3. File must be a Web `File` instance from FormData key `"file"`. Returns 400 `{ error: "No file provided" }` if missing.
4. `file.size > MAX_FILE_SIZE` check: `MAX_FILE_SIZE = 2 * 1024 * 1024` (exactly 2,097,152 bytes). Returns 400 `{ error: "File size must be less than 2MB" }`.
5. `ALLOWED_IMAGE_TYPES` check:
   ```ts
   const ALLOWED_IMAGE_TYPES = [
     "image/jpeg",
     "image/jpg",
     "image/png",
     "image/webp",
     "image/gif",
   ];
   ```
   Returns 400 `{ error: "Only image files (JPEG, PNG, WebP, GIF) are allowed" }` if MIME not in list.
6. Upload key: `` `users/${user.id}/bookmarks/${params.bookmarkId}/${Date.now()}-${file.name}` ``
   (note: this uses `` `${Date.now()}-${file.name}` `` as the `fileName` parameter, with the extension extracted from `file.name` by `uploadFileToS3`).
   Actual constructed key becomes: `` `users/${userId}/bookmarks/${bookmarkId}/${Date.now()}-${file.name}.<ext>` ``
7. On S3 upload failure (null return): 500 `{ error: "Failed to upload file" }`.
8. **Prisma update** (to be replaced by Convex mutation):
   ```ts
   prisma.bookmark.update({
     where: { id: params.bookmarkId, userId: user.id },
     data: { preview: s3Url },
   })
   ```
9. Success response:
   ```json
   { "success": true, "previewUrl": "<s3Url>", "bookmark": { ...updatedBookmark } }
   ```

### 1.7 `apps/web/src/routes/api.fake-worker.ts`

Dev/test stub: `GET /api/fake-worker?url=<url>`
- Returns a hardcoded 1x1 PNG pixel (67 bytes) with `Content-Type: image/png`.
- Used in CI / local dev to avoid real Cloudflare calls.
- Returns 400 if `?url` missing.

### 1.8 `apps/web/src/routes/api.fake-worker.pdf.ts`

Dev/test stub: `GET /api/fake-worker/pdf?url=<url>`
- Validates URL is present and parseable. 400 if missing or invalid.
- Returns a hardcoded 1x1 JPEG pixel with `Content-Type: image/jpeg`.

### 1.9 `apps/web/src/routes/api.fake-worker.youtube.ts`

Dev/test stub: `GET /api/fake-worker/youtube?videoId=<id>`
- Returns 400 if `videoId` missing.
- Returns fake JSON:
  ```json
  {
    "title": "Test YouTube Video - <videoId>",
    "thumbnail": "https://i.ytimg.com/vi/<videoId>/maxresdefault.jpg",
    "transcript": "[00:00] This is a fake transcript for testing purposes.\n[00:15] The video content would be here.\n[00:30] End of fake transcript."
  }
  ```

---

## 2. Business logic, algorithms, constants, and magic numbers

### Key path convention
```
users/{userId}/bookmarks/{bookmarkId}/{filename}
```
This path must be preserved exactly so that existing CDN URLs (stored in the `preview` field of migrated bookmarks) remain valid.

### Public CDN URL formula
```
${R2_URL}/${key}
```
Where `key` is the full path including the `users/...` prefix.

### Upload filename construction
- **File upload**: `` `${Date.now()}-${file.name}` `` with the extension extracted from `file.name.split(".").pop()`.
  - The `prefix` passed by the route is `users/${user.id}/bookmarks/${bookmarkId}`.
  - Full key: `` `users/${userId}/bookmarks/${bookmarkId}/${Date.now()}-${baseName}.${ext}` ``.
- **Buffer upload**: extension from `mime.extension(contentType) || "bin"`.
- **URL upload**: extension from response `Content-Type` header via `mime.extension()`, falling back to `"bin"`.

### File validation constants (MUST be preserved exactly)
```ts
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2097152 bytes
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
```

### Cloudflare Browser Rendering defaults
| Parameter | Default value |
|-----------|--------------|
| `gotoOptions.waitUntil` | `"networkidle0"` |
| `gotoOptions.timeout` | `30000` (ms) |
| `viewport` | `{ width: 1920, height: 1080 }` |
| `screenshotOptions.type` | `"png"` |
| `screenshotOptions.fullPage` | `false` |

### PDF URL modification (for `capturePDFScreenshot`)
Append to URL: `#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
Full modified URL: `` `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH` ``

### YouTube transcript time format
```ts
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
```
Transcript line format: `` `[${formatTime(entry.offset)}] ${entry.text}` `` joined with `"\n"`.

---

## 3. External API / SDK calls

### 3.1 AWS SDK v3 — Cloudflare R2 (S3-compatible)

**Package:** `@aws-sdk/client-s3`

**Client construction:**
```ts
new S3Client({
  region: "auto",          // R2-specific: must be "auto"
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
```

**Upload:** `PutObjectCommand({ Bucket, Key, Body, ContentType })`
- `Bucket`: `process.env.AWS_S3_BUCKET_NAME`
- `Key`: full path string (see key convention)
- `Body`: `Buffer`
- `ContentType`: MIME string

**Delete:** `DeleteObjectCommand({ Bucket, Key })`

**Env vars:**
| Env var | Purpose |
|---------|---------|
| `AWS_ACCESS_KEY_ID` | R2 access key |
| `AWS_SECRET_ACCESS_KEY` | R2 secret key |
| `AWS_S3_BUCKET_NAME` | Bucket name |
| `AWS_ENDPOINT` | R2 S3-compatible endpoint URL |
| `R2_URL` | Public CDN base URL for reading objects |

### 3.2 Cloudflare Browser Rendering REST API

**Endpoint:** `POST https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`

**Headers:**
```
Authorization: Bearer <CLOUDFLARE_API_TOKEN>
Content-Type: application/json
```

**Request body (exact fields):**
```json
{
  "url": "<target URL>",
  "gotoOptions": {
    "waitUntil": "networkidle0",
    "timeout": 30000
  },
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "screenshotOptions": {
    "fullPage": false,
    "type": "png"
  }
}
```

**Success response:** binary PNG image in response body (read as `arrayBuffer()`).
**Error response:** text body with error description; HTTP status is non-2xx.

**Env vars:**
| Env var | Purpose |
|---------|---------|
| `CLOUDFLARE_API_TOKEN` | Bearer token for auth |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID in URL path |

### 3.3 YouTube oEmbed API

**Endpoint:** `GET https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`

**Response fields used:**
```json
{ "title": "Video title" }
```

**Thumbnail URL (no API call needed):**
`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`

### 3.4 YouTube Transcript Library

**Package:** `@danielxceron/youtube-transcript`

**Usage:**
```ts
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";
const transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId);
// transcriptResponse: Array<{ offset: number, text: string, ... }>
```

Errors are caught and swallowed — transcript is optional.

---

## 4. Validation rules, plan/limit checks, ownership checks, security guards

All from Phase 17 section B3. Must be reproduced verbatim in the Convex `uploadBookmarkScreenshot` authAction:

1. **Authentication**: caller must be authenticated (use `authAction` builder). No unauthenticated uploads.

2. **Bookmark ownership**: `bookmark.userId === callerId`. The query to look up the bookmark must include the `userId` filter (equivalent to `getUserBookmark(bookmarkId, userId)`). Return error if not found or wrong owner. Never trust the client-supplied `bookmarkId` alone.

3. **File size limit**: `file.size > 2 * 1024 * 1024` → reject. The constant is `2 * 1024 * 1024` (2 MB = 2,097,152 bytes).

4. **MIME type allowlist**: reject if `file.type` not in `["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]`.

5. **Post-upload DB write**: must also update the bookmark's `preview` field atomically (via an internal mutation called from the action after the R2 upload succeeds).

For internal-only R2 operations (called from the processing pipeline):
- No user-facing size/type checks needed for pipeline-generated images (screenshot, OG image, favicon) since these are internally generated.
- Ownership is implicitly guaranteed by the pipeline context.

---

## 5. Target Convex file(s), function names, signatures, and "use node" requirements

### 5.1 `packages/backend/convex/files/actions.ts`

Must have `"use node"` directive at the top (uses `@aws-sdk/client-s3`, `mime-types`, Node `Buffer`).

**Functions:**

```ts
// Internal action: upload a Buffer to R2
// Called from pipeline steps (screenshot, OG image, favicon, etc.)
export const uploadBuffer = internalAction({
  args: {
    buffer: v.bytes(),          // base64/bytes-encoded buffer
    key: v.string(),            // full key: "users/{userId}/bookmarks/{bookmarkId}/{filename}"
    contentType: v.string(),
  },
  returns: v.string(),          // CDN URL
  handler: async (ctx, args) => { ... }
});

// Internal action: upload a file from a URL to R2
// Called from pipeline when fetching OG images, favicons, thumbnails
export const uploadFileFromURL = internalAction({
  args: {
    url: v.string(),
    key: v.string(),            // full key path
    contentType: v.optional(v.string()),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => { ... }
});

// Internal action: delete one or more objects from R2
// Called from bookmarks.mutations.remove
export const deleteObjects = internalAction({
  args: {
    keys: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => { ... }
});

// Auth action: user-facing screenshot upload (replaces the TanStack route)
// Validates ownership, size, MIME; uploads to R2; patches bookmark.preview
export const uploadBookmarkScreenshot = authAction({
  args: {
    bookmarkId: v.id("bookmarks"),
    fileData: v.bytes(),        // raw file bytes
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    previewUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Auth: ctx.userId is available from authAction
    // 2. Ownership: ctx.runQuery(internal.bookmarks.queries.getById, { id, userId })
    // 3. Size check: args.fileSize > 2 * 1024 * 1024 → throw
    // 4. MIME check: args.contentType not in ALLOWED_IMAGE_TYPES → throw
    // 5. Key: `users/${userId}/bookmarks/${bookmarkId}/${Date.now()}-${fileName}`
    // 6. Upload via S3Client PutObjectCommand
    // 7. Patch bookmark: ctx.runMutation(internal.bookmarks.mutations.updatePreview, { id, preview: cdnUrl })
    // 8. Return { success: true, previewUrl: cdnUrl }
  }
});
```

### 5.2 `packages/backend/convex/processing/screenshot.ts`

Must have `"use node"` directive at the top (uses Node `fetch`, `Buffer`).

**Functions:**

```ts
// Internal action: capture a web page screenshot via Cloudflare Browser Rendering
// Returns the R2 CDN URL of the uploaded screenshot, or null on failure
export const captureAndUploadScreenshot = internalAction({
  args: {
    url: v.string(),
    userId: v.string(),
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // 1. Call Cloudflare Browser Rendering API (POST, Bearer auth, 1920x1080, networkidle0, 30s)
    // 2. Get PNG buffer from response
    // 3. Build key: `users/${userId}/bookmarks/${bookmarkId}/screenshot.png`
    // 4. Call ctx.runAction(internal.files.actions.uploadBuffer, { buffer, key, contentType: "image/png" })
    // 5. Return CDN URL or null
  }
});

// Internal action: capture a PDF page screenshot via Cloudflare Browser Rendering
// Returns the R2 CDN URL, or null on failure
export const captureAndUploadPDFScreenshot = internalAction({
  args: {
    url: v.string(),
    userId: v.string(),
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // 1. Modify URL: append `#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
    // 2. Call Cloudflare Browser Rendering API (same params as captureAndUploadScreenshot)
    // 3. Upload PNG buffer to R2 under key `users/${userId}/bookmarks/${bookmarkId}/pdf-screenshot.png`
    // 4. Return CDN URL or null
  }
});
```

Note: `captureScreenshot` and `capturePDFScreenshot` can also be exported as plain helper functions (not Convex actions) within the file if called only from within other actions in the same file. If called cross-file, they must be internal actions.

### 5.3 `packages/backend/convex/processing/youtube.ts`

Must have `"use node"` directive.

```ts
// Internal action: fetch YouTube metadata (title, thumbnail, transcript)
export const fetchYouTubeMetadata = internalAction({
  args: {
    videoId: v.string(),
  },
  returns: v.object({
    title: v.string(),
    thumbnail: v.string(),
    transcript: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Fetch oEmbed: https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json
    // 2. thumbnail = https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg
    // 3. Try YoutubeTranscript.fetchTranscript(videoId) — catch and continue without transcript
    // 4. Format transcript: each entry as `[MM:SS] text` joined by \n
    // 5. Return { title, thumbnail, transcript? }
  }
});
```

---

## 6. Edge cases, error handling, and known gotchas

### R2 / S3 client

- **`region: "auto"` is not negotiable.** R2 requires this exact value; any real AWS region string will fail.
- **`mime-types` package** is required for extension detection in buffer/URL uploads. Must be in `packages/backend/package.json` deps.
- **Silent failure in `uploadFileToS3`**: the original function logs `"Invalid s3 client send"` and returns `undefined` (not `null`). The Convex port should normalize to `null` for consistency.
- **CI bypass**: `uploadFileFromURLToS3` returns `"https://placehold.co/500x500"` when `env.CI === true`. Convex actions in CI should check `process.env.CI` and short-circuit similarly to avoid hitting real R2 in tests.

### Cloudflare Browser Rendering

- **Rate limits and 429s**: The API has per-account concurrency limits. The action must handle `!response.ok` and throw a structured error. The processing pipeline (Phase 06) should catch these errors and degrade gracefully — the bookmark should reach `READY` status even if the screenshot fails.
- **Timeout**: `30000` ms is the configured timeout in `gotoOptions`. Add a global fetch timeout (via `AbortController`) slightly larger (e.g. 35s) to prevent the Convex action from hanging.
- **Response body on error**: use `.text().catch(() => "Unknown error")` to safely read error text, matching the original pattern.
- **PNG output only**: the current implementation always uses `type: "png"` in `screenshotOptions`. Content-type for R2 upload is `"image/png"`.

### PDF screenshot

- **Hash params approach**: `capturePDFScreenshot` modifies the URL by appending `#toolbar=0&navpanes=0&scrollbar=0&view=FitH` before passing to `captureScreenshot`. This suppresses the browser's built-in PDF UI toolbar. It relies on the browser (via Cloudflare rendering) having PDF rendering capability.
- **Worker PDF approach is different**: the Puppeteer-based worker used PDF.js + `data:text/html` injection. This is more complex and is NOT ported. The simpler hash-params approach from `screenshot.ts` is the correct one to use.
- **Scale/quality**: the original Cloudflare API approach uses PNG at 1920x1080. The Puppeteer worker used JPEG quality 80 at 1280x720. The Convex port should use the Cloudflare API's defaults (PNG, 1920x1080).

### YouTube

- **Transcript failures are swallowed**: this is intentional. Many YouTube videos have no transcript. The action returns the metadata regardless.
- **oEmbed title fallback**: original code uses `oembedData.title || "Untitled Video"`.
- **KV cache is not ported**: the worker had KV caching (commented out for reads, active for writes). Convex has no equivalent KV. If caching is needed in future, use Convex's scheduler or an external Redis. For now, no caching.
- **Transcript library**: `@danielxceron/youtube-transcript`. Verify this package is available and builds in Convex Node environment. It makes HTTP requests to YouTube, so it requires `"use node"`.

### Upload route (user-facing)

- **`fileName` in key construction**: the original route uses `` `${Date.now()}-${file.name}` `` as the `fileName` arg to `uploadFileToS3`, which appends the extension from `file.name`. The resulting key is `` `users/${userId}/bookmarks/${bookmarkId}/${Date.now()}-${file.name}.<ext>` ``. This can include the extension twice if `file.name` already includes it (e.g. `photo.jpg.jpg`). The implementation reproduces this existing behavior.
- **FormData → bytes in Convex**: the Convex action cannot accept a `File`/`FormData` directly. The web client must extract the bytes (`file.arrayBuffer()`) and pass as `v.bytes()` (or base64-encoded string). The action args schema must accommodate this.
- **Atomic update**: after uploading, call an internal mutation to update `bookmark.preview`. Use `ctx.runMutation(internal.bookmarks.mutations.updatePreview, { id: args.bookmarkId, preview: cdnUrl, userId: ctx.userId })` — the mutation must re-verify ownership.

### General Convex constraints

- **Never store raw binary blobs in Convex documents.** Only store CDN URL strings.
- **`"use node"` required** for all files in this spec (AWS SDK, `mime-types`, `Buffer`, `@danielxceron/youtube-transcript`). Do not mix `"use node"` actions with queries or mutations in the same file.
- **Convex `v.bytes()`** serializes to base64 over the wire but arrives as `ArrayBuffer` in the handler. Convert to `Buffer` with `Buffer.from(new Uint8Array(args.fileData))`.
- **Key uniqueness**: timestamps (`Date.now()`) provide uniqueness for user uploads. For pipeline-generated files (screenshot, OG image), use fixed names (`screenshot.png`, `og-image.png`, `favicon.png`) per bookmark — this allows safe overwrites on reprocessing.

---

## 7. Fake worker routes — disposition

The three `api.fake-worker*.ts` routes exist for CI/dev only. They are TanStack routes and should be **removed** after the Convex migration (Phase 15 cleanup). In Convex, CI bypass is handled via the `process.env.CI` check directly in the action (returning placeholder URLs). The hardcoded pixel bytes and fake YouTube JSON do not need to be ported.

---

## 8. Summary of env vars required in Convex backend

Set with `npx convex env set`:

| Variable | Value source |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | R2 access key |
| `AWS_SECRET_ACCESS_KEY` | R2 secret key |
| `AWS_S3_BUCKET_NAME` | R2 bucket name |
| `AWS_ENDPOINT` | R2 S3-compatible endpoint URL |
| `R2_URL` | Public CDN base URL (no trailing slash) |
| `CLOUDFLARE_API_TOKEN` | API token for Browser Rendering |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

These are already listed in the overview's env var section (section 5 of `00-overview.md`).
