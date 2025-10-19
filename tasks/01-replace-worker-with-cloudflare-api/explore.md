# Task: Replace Screenshot Worker with Cloudflare API and Local YouTube Metadata

## Executive Summary

This task involves migrating from a self-hosted Cloudflare Worker (`saveit-screenshot`) to:
1. **Direct Cloudflare Browser Rendering REST API** for screenshots (web pages and PDFs)
2. **Local YouTube oEmbed API + transcript library** for YouTube metadata extraction

**Benefits**:
- Eliminate worker deployment and maintenance
- Reduce network hops (faster response)
- Lower costs (fewer worker invocations)
- Simpler architecture (direct API calls)

**Migration Scope**:
- 4 bookmark processors using screenshot endpoint
- 1 bookmark processor using YouTube endpoint
- Environment variable changes
- New utility functions for API calls
- Package dependency updates

**Cloudflare Plan**: Paid/Premium (Workers Paid)
- 180 API requests/minute
- 30 concurrent browsers max
- 30 browser launches/minute
- 10 hours/month included, $0.09/hour overage
- **Estimated cost**: $0/month (current volume stays within included hours)

---

## Current Implementation Analysis

### Screenshot Worker Overview

**Location**: `apps/worker/`
**Production URL**: `https://saveit-screenshot.misty-unit-17f1.workers.dev`

**Three Endpoints**:
1. `GET /?url=<URL>` - Web page screenshots (1280x720px JPEG)
2. `GET /pdf?url=<PDF_URL>` - PDF rendering (first page JPEG)
3. `GET /youtube?videoId=<ID>` - YouTube metadata + transcript (JSON)

**Technologies**:
- `@cloudflare/puppeteer` for browser automation
- `@danielxceron/youtube-transcript` for transcript extraction
- KV storage (`SAVEIT_KV`) for 24-hour caching
- Browser binding (`MYBROWSER`) for Puppeteer

### Files Using SCREENSHOT_WORKER_URL

#### 1. Page Bookmark Screenshots
**File**: `apps/web/src/lib/inngest/bookmark-type/process-page-bookmark.ts:137-144`

```typescript
const url = new URL(env.SCREENSHOT_WORKER_URL);
url.searchParams.set("url", context.url);

const screenshotUrl = await uploadFileFromURLToS3({
  url: url.toString(),
  prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
  fileName: "screenshot",
});
```

**Pattern**:
- GET request with URL query parameter
- Binary response (JPEG image)
- Uploaded to S3 via `uploadFileFromURLToS3`
- Error handling: returns `null` on failure

**Fallback chain**:
1. Extension pre-uploaded screenshot
2. Playwright test placeholder
3. Worker screenshot
4. `null` (uses og:image later)

#### 2. Article Bookmark Screenshots
**File**: `apps/web/src/lib/inngest/bookmark-type/process-article-bookmark.ts:128-135`

Same pattern as page bookmarks.

#### 3. PDF Bookmark Screenshots
**File**: `apps/web/src/lib/inngest/bookmark-type/process-pdf-bookmark.ts:167-180`

```typescript
const screenshotResponse = await fetch(
  `${workerUrl}/pdf?url=${encodeURIComponent(context.url)}`,
  {
    headers: {
      "User-Agent": "SaveIt.now PDF Processor",
    },
  },
);

const screenshotBuffer = await screenshotResponse.arrayBuffer();

const uploadResult = await uploadBufferToS3({
  buffer: Buffer.from(screenshotBuffer),
  fileName: `pdf-screenshot-${context.bookmarkId}-${Date.now()}.jpg`,
  contentType: "image/jpeg",
  prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
});
```

**Pattern**:
- GET request with encoded URL parameter
- Custom `User-Agent` header
- Binary response processed with `arrayBuffer()`
- Direct upload to S3 via `uploadBufferToS3`

#### 4. YouTube Metadata Extraction
**File**: `apps/web/src/lib/inngest/bookmark-type/process-youtube-bookmark.ts:84-138`

```typescript
const data = await upfetch(
  `${env.SCREENSHOT_WORKER_URL}/youtube?videoId=${youtubeId}`,
  {
    schema: z.object({
      title: z.string(),
      thumbnail: z.string(),
      transcript: z.string().optional(),
    }),
  },
);
```

**Pattern**:
- GET request with `videoId` query parameter
- JSON response with Zod schema validation
- Called **always** (even when extension has transcript)
- Used for metadata (title, thumbnail) + optional transcript

**Fallback chain**:
1. Extension transcript (preferred)
2. Worker metadata + transcript
3. Basic info from URL

### Environment Configuration

**File**: `apps/web/src/lib/env.ts:17-20`

```typescript
SCREENSHOT_WORKER_URL: z
  .string()
  .min(1)
  .default("https://ci-placeholder.com"),
```

**Also in**: `turbo.json` (lines 22, 111) - required for builds

**Current value**: `https://saveit-screenshot.misty-unit-17f1.workers.dev`

### Upload Utilities

**File**: `apps/web/src/lib/aws-s3/aws-s3-upload-files.ts`

#### `uploadFileFromURLToS3` (Lines 66-102)
```typescript
export async function uploadFileFromURLToS3(params: {
  url: string;
  prefix: string;
  fileName: string;
}): Promise<string | null> {
  const response = await fetch(params.url);
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const fileExtension = mime.extension(contentType) || "bin";
  const buffer = await response.arrayBuffer();

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: uniqueFileName,
    Body: Buffer.from(buffer),
    ContentType: contentType,
  });

  await s3.send(command);
  return `${env.R2_URL}/${uniqueFileName}`;
}
```

**Flow**: Fetch URL → Get content-type → Convert to Buffer → Upload to S3/R2

#### `uploadBufferToS3` (Lines 38-61)
- Accepts pre-processed Buffer
- Requires explicit `contentType` parameter
- Used for PDF screenshots

---

## Cloudflare Browser Rendering API Research

### API Endpoint

```
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/screenshot
```

### Authentication

```
Authorization: Bearer {api_token}
```

**Required Permission**: Browser Rendering - Edit

### Request Format

```json
{
  "url": "https://example.com",
  "gotoOptions": {
    "waitUntil": "networkidle0",
    "timeout": 30000
  },
  "waitForTimeout": 2000,
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "screenshotOptions": {
    "fullPage": false,
    "type": "png",
    "omitBackground": false
  }
}
```

### Response

- **Content-Type**: `image/png` or `image/jpeg`
- **Body**: Binary image data
- **Status**: 200 OK on success

### PDF Handling

For PDFs without browser UI, append hash parameters:

```
https://example.com/document.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH
```

### Rate Limits (2025)

**Paid Plan** (Your Current Plan):
- **REST API**: 180 requests per minute
- **Concurrent Browsers**: 30 browsers per account (max)
- **Browser Launches**: 30 new browsers per minute
- **Included Hours**: 10 hours per month
- **Overage Cost**: $0.09 per additional browser hour
- **Concurrency Cost**: $2.00 per additional concurrent browser (averaged monthly, beyond 10)

**Free Tier** (for reference):
- REST API: 6 requests per minute
- Concurrent Browsers: 3 per account
- Browser Launches: 3 per minute
- Included Hours: 10 minutes per day

### Session Reuse (2024 Feature)

Native session reuse reduces 60-90% of browser instances needed (no Durable Objects required).

### TypeScript SDK

```bash
npm install cloudflare
```

```typescript
import Cloudflare from 'cloudflare';

const client = new Cloudflare({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

const screenshot = await client.browserRendering.screenshot({
  account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
  url: 'https://example.com',
  // ... options
});
```

---

## YouTube API Research

### YouTube oEmbed API

**Endpoint**:
```
GET https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={videoId}
```

**No authentication required**

**Response**:
```json
{
  "title": "Video Title",
  "author_name": "Channel Name",
  "thumbnail_url": "https://i.ytimg.com/vi/{videoId}/maxresdefault.jpg",
  "html": "<iframe...>",
  "width": 480,
  "height": 270
}
```

**Limitations**:
- No duration data
- No transcript
- Basic metadata only

**Thumbnail URL Pattern**:
```
https://i.ytimg.com/vi/{videoId}/maxresdefault.jpg
```

### YouTube Transcript Library

**Package**: `@danielxceron/youtube-transcript`

**Installation**:
```bash
pnpm add @danielxceron/youtube-transcript
```

**Usage**:
```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

const transcript = await YoutubeTranscript.fetchTranscript(videoId);
// Returns: Array<{ text: string, offset: number, duration: number }>
```

**Features**:
- HTML scraping + InnerTube API fallback
- Supports YouTube Shorts
- TypeScript types included
- Better production reliability than `youtube-transcript-api`

**Format Conversion**:
```typescript
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const formattedTranscript = transcript
  .map(entry => `[${formatTime(entry.offset)}] ${entry.text}`)
  .join('\n');
```

---

## Migration Implementation Plan

### New Utility Functions Needed

#### 1. Cloudflare Screenshot Capture

**File**: `apps/web/src/lib/cloudflare/screenshot.ts` (new)

```typescript
import { env } from '../env';

interface ScreenshotOptions {
  url: string;
  viewport?: { width: number; height: number };
  waitUntil?: 'load' | 'networkidle0' | 'networkidle2';
  timeout?: number;
  fullPage?: boolean;
}

export async function captureScreenshot(
  options: ScreenshotOptions
): Promise<Buffer> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: options.url,
        gotoOptions: {
          waitUntil: options.waitUntil || 'networkidle0',
          timeout: options.timeout || 30000,
        },
        viewport: options.viewport || { width: 1920, height: 1080 },
        screenshotOptions: {
          fullPage: options.fullPage || false,
          type: 'png',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Screenshot failed: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function capturePDFScreenshot(url: string): Promise<Buffer> {
  // Add hash parameters to hide PDF UI
  const pdfUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

  return captureScreenshot({
    url: pdfUrl,
    viewport: { width: 1920, height: 1080 },
    waitUntil: 'networkidle0',
    timeout: 30000,
  });
}
```

#### 2. YouTube Metadata Fetcher

**File**: `apps/web/src/lib/youtube/metadata.ts` (new)

```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { z } from 'zod';

const YouTubeOEmbedSchema = z.object({
  title: z.string(),
  author_name: z.string(),
  thumbnail_url: z.string(),
});

export interface YouTubeMetadata {
  title: string;
  author: string;
  thumbnail: string;
  transcript?: string;
}

export async function getYouTubeMetadata(
  videoId: string,
  includeTranscript = true
): Promise<YouTubeMetadata> {
  // Fetch basic metadata from oEmbed API
  const oembedUrl = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`;
  const oembedResponse = await fetch(oembedUrl);

  if (!oembedResponse.ok) {
    throw new Error(`Failed to fetch YouTube metadata: ${oembedResponse.statusText}`);
  }

  const oembedData = await oembedResponse.json();
  const validated = YouTubeOEmbedSchema.parse(oembedData);

  const metadata: YouTubeMetadata = {
    title: validated.title,
    author: validated.author_name,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  };

  // Optionally fetch transcript
  if (includeTranscript) {
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

      if (transcriptData && transcriptData.length > 0) {
        metadata.transcript = transcriptData
          .map(entry => `[${formatTime(entry.offset)}] ${entry.text}`)
          .join('\n');
      }
    } catch (error) {
      console.warn('Failed to fetch transcript:', error);
      // Continue without transcript
    }
  }

  return metadata;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

### Environment Variables to Add

**File**: `apps/web/src/lib/env.ts`

Add these new variables:

```typescript
CLOUDFLARE_API_TOKEN: z.string().min(1),
CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
```

Remove (or deprecate):

```typescript
SCREENSHOT_WORKER_URL: z.string().min(1).default("https://ci-placeholder.com"),
```

**File**: `.env.local` (add)

```
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=3eb3623a08be565da5444463c39199c4
```

### Package Dependencies to Add

**File**: `apps/web/package.json`

```json
{
  "dependencies": {
    "@danielxceron/youtube-transcript": "^1.2.3"
  }
}
```

---

## Files to Modify

### 1. Process Page Bookmark

**File**: `apps/web/src/lib/inngest/bookmark-type/process-page-bookmark.ts`

**Changes** (lines 137-144):

**Before**:
```typescript
const url = new URL(env.SCREENSHOT_WORKER_URL);
url.searchParams.set("url", context.url);

const screenshotUrl = await uploadFileFromURLToS3({
  url: url.toString(),
  prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
  fileName: "screenshot",
});
```

**After**:
```typescript
import { captureScreenshot } from '../../cloudflare/screenshot';

const screenshotBuffer = await captureScreenshot({
  url: context.url,
  viewport: { width: 1920, height: 1080 },
  waitUntil: 'networkidle0',
  timeout: 30000,
});

const screenshotUrl = await uploadBufferToS3({
  buffer: screenshotBuffer,
  fileName: 'screenshot',
  contentType: 'image/png',
  prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
});
```

### 2. Process Article Bookmark

**File**: `apps/web/src/lib/inngest/bookmark-type/process-article-bookmark.ts`

Same changes as page bookmark (lines 128-135).

### 3. Process PDF Bookmark

**File**: `apps/web/src/lib/inngest/bookmark-type/process-pdf-bookmark.ts`

**Changes** (lines 167-180):

**Before**:
```typescript
const screenshotResponse = await fetch(
  `${workerUrl}/pdf?url=${encodeURIComponent(context.url)}`,
  {
    headers: {
      "User-Agent": "SaveIt.now PDF Processor",
    },
  },
);

const screenshotBuffer = await screenshotResponse.arrayBuffer();
```

**After**:
```typescript
import { capturePDFScreenshot } from '../../cloudflare/screenshot';

const screenshotBuffer = await capturePDFScreenshot(context.url);
```

### 4. Process YouTube Bookmark

**File**: `apps/web/src/lib/inngest/bookmark-type/process-youtube-bookmark.ts`

**Changes** (lines 73-138):

**Before**:
```typescript
const videoInfo = await step.run(
  "get-video-info",
  async (): Promise<{
    title: string;
    thumbnail: string;
    transcript?: string;
    transcriptSource: "extension" | "worker" | "none";
  }> => {
    if (!extensionTranscript) {
      try {
        const data = await upfetch(
          `${env.SCREENSHOT_WORKER_URL}/youtube?videoId=${youtubeId}`,
          {
            schema: z.object({
              title: z.string(),
              thumbnail: z.string(),
              transcript: z.string().optional(),
            }),
          },
        );
        return {
          ...data,
          transcript: data.transcript,
          transcriptSource: "worker" as const,
        };
      } catch (error) {
        // ... error handling
      }
    } else {
      // ... similar worker call for metadata only
    }
  },
);
```

**After**:
```typescript
import { getYouTubeMetadata } from '../../youtube/metadata';

const videoInfo = await step.run(
  "get-video-info",
  async (): Promise<{
    title: string;
    thumbnail: string;
    transcript?: string;
    transcriptSource: "extension" | "api" | "none";
  }> => {
    try {
      const metadata = await getYouTubeMetadata(
        youtubeId,
        !extensionTranscript // Only fetch transcript if not from extension
      );

      return {
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        transcript: extensionTranscript || metadata.transcript,
        transcriptSource: extensionTranscript ? "extension" :
                         metadata.transcript ? "api" : "none",
      };
    } catch (error) {
      logger.debug("Failed to get video info from YouTube API:", error);
      return {
        title: context.url,
        thumbnail: "",
        transcript: extensionTranscript,
        transcriptSource: extensionTranscript ? "extension" : "none",
      };
    }
  },
);
```

---

## Patterns to Preserve

### 1. Inngest Step Wrapping
All external API calls must be wrapped in `step.run()` for retry and durability:

```typescript
await step.run("step-name", async () => {
  // API call here
});
```

### 2. Error Graceful Degradation
Failed screenshots should not block bookmark creation:

```typescript
try {
  const screenshot = await captureScreenshot(...);
  return screenshot;
} catch {
  return null; // Fallback to og:image
}
```

### 3. CI Testing Support
Maintain placeholder images for Playwright tests:

```typescript
if (context.url.includes("isPlaywrightTest=true")) {
  return "https://via.placeholder.com/1200x630/f0f0f0/333333?text=Playwright+Test+Placeholder";
}
```

### 4. Content-Type Handling
Always specify `contentType` when uploading to S3:

```typescript
await uploadBufferToS3({
  buffer: screenshotBuffer,
  fileName: 'screenshot',
  contentType: 'image/png', // or 'image/jpeg'
  prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
});
```

### 5. Metadata Preservation
Store transcript source and extraction timestamps:

```typescript
const finalMetadata = {
  youtubeId,
  transcriptAvailable: !!videoInfo.transcript,
  transcriptSource: videoInfo.transcriptSource,
  transcriptExtractedAt: new Date().toISOString(),
};
```

---

## Edge Cases & Concerns

### 1. Rate Limiting
**Cloudflare API (Paid Plan)**:
- REST API: 180 requests per minute
- Concurrent browsers: 30 max
- Browser launches: 30 per minute

**Assessment**: Rate limits are VERY generous for paid plan. Your current bookmark volume should be well within these limits.

**Mitigation** (if limits reached):
- Implement retry logic with exponential backoff for 429 errors
- Monitor usage via Cloudflare dashboard
- Set up alerts at 80% of limits
- Consider batching/queuing only during extreme traffic spikes

### 2. Timeout Handling
**Current**: No explicit timeouts on worker fetch

**New**: Configure timeouts in API request (30s recommended)

```typescript
gotoOptions: {
  timeout: 30000, // 30 seconds
}
```

### 3. Binary Response Size
**Concern**: Large screenshots may consume memory

**Mitigation**:
- Stream directly to S3 if possible
- Use JPEG with quality parameter for compression
- Set `fullPage: false` to limit size

### 4. YouTube Transcript Availability
**Concern**: Not all videos have transcripts

**Handling**:
- Gracefully handle missing transcripts
- Don't block metadata extraction on transcript failure
- Log failures for monitoring

### 5. PDF Hash Parameters
**Implementation**: Append `#toolbar=0&navpanes=0&scrollbar=0&view=FitH` to PDF URLs

**Verify**: Works consistently across different PDF formats

### 6. API Token Security
**Critical**: Never commit `CLOUDFLARE_API_TOKEN` to version control

**Best practices**:
- Use environment variables
- Rotate tokens periodically
- Use minimal permissions (Browser Rendering - Edit only)

### 7. Cost Management (Paid Plan)
**Included**: 10 browser hours per month (same as before)

**Pricing**:
- $0.09 per additional browser hour
- $2.00 per additional concurrent browser (averaged monthly, beyond 10)

**Current usage estimate**:
- Average bookmarks/day: ~150 (estimate)
- Screenshots per bookmark: 1
- Browser time per screenshot: ~5 seconds
- Monthly hours: (~150 bookmarks/day × 5s = 750s/day × 30 = 22,500s = **6.25 hours/month**)

**Cost Analysis**:
- ✅ **6.25 hours < 10 included hours** → **$0/month** (stays within included hours)
- Even at 2x volume (12.5 hours/month): Only $0.23/month overage
- At 5x volume (31 hours/month): Only $1.89/month overage

**Concurrency Cost**:
- With sequential processing (1 concurrent browser average): **$0/month** (within included 10)
- Only charged if averaging >10 concurrent browsers monthly (unlikely with current architecture)

**Recommendation**: Cost is negligible. No need for aggressive optimization.

### 8. Caching Strategy
**Worker had**: 24-hour KV cache for screenshots

**New approach options**:
1. No caching (simplest)
2. Database-based cache with screenshot URLs
3. Cloudflare cache API (if using Workers for API calls)

**Recommendation**: No caching initially (S3 URLs are already cached)

### 9. Extension Screenshot Priority
**Preserve**: Extension pre-uploaded screenshots take precedence

```typescript
const freshBookmark = await prisma.bookmark.findUnique({
  where: { id: context.bookmarkId },
  select: { preview: true },
});

if (freshBookmark?.preview) {
  return freshBookmark.preview; // Use extension screenshot
}
```

### 10. Playlist/Shorts Support
**YouTube**: Ensure `getVideoId()` regex supports all URL formats

Current regex supports:
- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/embed/VIDEO_ID`
- `youtube.com/v/VIDEO_ID`

**Test with**: YouTube Shorts URLs

---

## Testing Strategy

### Unit Tests

**Screenshot utility**:
```typescript
describe('captureScreenshot', () => {
  it('should capture screenshot from URL', async () => {
    const buffer = await captureScreenshot({ url: 'https://example.com' });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should handle PDF URLs with hash parameters', async () => {
    const buffer = await capturePDFScreenshot('https://example.com/doc.pdf');
    expect(buffer).toBeInstanceOf(Buffer);
  });
});
```

**YouTube metadata**:
```typescript
describe('getYouTubeMetadata', () => {
  it('should fetch metadata for valid video', async () => {
    const metadata = await getYouTubeMetadata('dQw4w9WgXcQ');
    expect(metadata.title).toBeTruthy();
    expect(metadata.thumbnail).toContain('ytimg.com');
  });

  it('should handle videos without transcripts', async () => {
    const metadata = await getYouTubeMetadata('SOME_VIDEO_ID');
    expect(metadata.transcript).toBeUndefined();
  });
});
```

### Integration Tests

**End-to-end bookmark processing**:
1. Create test bookmark with known URL
2. Trigger Inngest job
3. Verify screenshot uploaded to S3
4. Verify metadata extracted correctly
5. Check error handling with invalid URLs

### Manual Testing Checklist

- [ ] Web page screenshot (e.g., https://inngest.com)
- [ ] PDF screenshot (e.g., https://example.com/document.pdf)
- [ ] YouTube video with transcript
- [ ] YouTube video without transcript
- [ ] YouTube Shorts URL
- [ ] Invalid/broken URLs
- [ ] Timeout scenarios (very slow pages)
- [ ] Rate limit handling (rapid sequential requests)
- [ ] Extension screenshot precedence

---

## Rollback Plan

### Phase 1: Preparation
1. Keep worker running during migration
2. Deploy new code with feature flag
3. Test in staging environment

### Phase 2: Gradual Rollout
1. Enable new API for 10% of requests
2. Monitor error rates and latency
3. Gradually increase to 100%

### Phase 3: Worker Deprecation
1. Once stable, remove `SCREENSHOT_WORKER_URL` env variable
2. Delete worker code (`apps/worker/`)
3. Archive worker deployment

### Emergency Rollback
If critical issues arise:
1. Disable feature flag
2. Revert to worker endpoint
3. Investigate and fix issues
4. Re-deploy when ready

---

## Dependencies Summary

### New NPM Packages
- `@danielxceron/youtube-transcript` (^1.2.3)

### New Environment Variables
- `CLOUDFLARE_API_TOKEN` (required)
- `CLOUDFLARE_ACCOUNT_ID` (required)

### Deprecated Environment Variables
- `SCREENSHOT_WORKER_URL` (remove after migration)

### New Files to Create
- `apps/web/src/lib/cloudflare/screenshot.ts`
- `apps/web/src/lib/youtube/metadata.ts`

### Files to Modify
- `apps/web/src/lib/env.ts`
- `apps/web/src/lib/inngest/bookmark-type/process-page-bookmark.ts`
- `apps/web/src/lib/inngest/bookmark-type/process-article-bookmark.ts`
- `apps/web/src/lib/inngest/bookmark-type/process-pdf-bookmark.ts`
- `apps/web/src/lib/inngest/bookmark-type/process-youtube-bookmark.ts`
- `apps/web/package.json`
- `turbo.json` (update env vars)

### Files to Delete (post-migration)
- `apps/worker/` (entire directory)

---

## Key Decisions & Trade-offs

### 1. Direct REST API vs TypeScript SDK
**Decision**: Use native `fetch()` for simplicity
**Reason**: SDK adds dependency; fetch is sufficient for single endpoint
**Trade-off**: Manual error handling vs SDK convenience

### 2. PNG vs JPEG Screenshots
**Decision**: Use PNG by default
**Reason**: Better quality, no compression artifacts
**Trade-off**: Larger file sizes (~2-3x) but better visual quality

### 3. Synchronous vs Queued Screenshots
**Decision**: Keep synchronous (inline with Inngest job)
**Reason**: Simpler architecture, Inngest handles retries
**Trade-off**: Job duration longer but fewer moving parts

### 4. Caching Strategy
**Decision**: No screenshot caching
**Reason**: S3 URLs are permanent, re-screenshots rare
**Trade-off**: Potential duplicate API calls but simpler code

### 5. YouTube Transcript Always Fetch
**Decision**: Only fetch when extension doesn't provide
**Reason**: Reduce API calls and processing time
**Trade-off**: Trust extension data quality

---

## Success Criteria

### Functional Requirements
- [ ] All bookmark types process successfully
- [ ] Screenshots uploaded to S3 correctly
- [ ] YouTube metadata extracted accurately
- [ ] Transcripts formatted properly
- [ ] Error handling works gracefully
- [ ] No regression in existing features

### Performance Requirements
- [ ] Screenshot generation < 10 seconds (p95)
- [ ] YouTube metadata fetch < 3 seconds (p95)
- [ ] Overall job duration within current benchmarks
- [ ] Rate limits respected (no 429 errors)

### Quality Requirements
- [ ] Screenshot quality matches or exceeds current
- [ ] PDF rendering without browser UI
- [ ] YouTube thumbnails high resolution (maxresdefault)
- [ ] Transcript formatting preserved

### Cost Requirements (Paid Plan)
- [ ] Monitor browser hour usage (expect ~6-7 hours/month, within 10 included)
- [ ] Set up usage alerts at 8 hours/month (80% of included tier)
- [ ] Track actual costs after 1 month (should be $0 with current volume)
- [ ] No aggressive cost optimization needed - limits are generous

---

## Next Steps

1. **Review this exploration** with team
2. **Run `/epct:plan tasks/01-replace-worker-with-cloudflare-api`** to create detailed implementation plan
3. **Set up Cloudflare API credentials** (get token and verify account ID)
4. **Create feature flag** for gradual rollout
5. **Begin implementation** following the plan

---

**Exploration completed**: 2025-10-19
**Total files analyzed**: 15+
**Total APIs researched**: 3 (Cloudflare Browser Rendering, YouTube oEmbed, YouTube Transcript)
