# Implementation Plan: Replace Worker with Cloudflare API + Smart Content Fetching

## Overview

This implementation replaces the self-hosted Cloudflare Worker with direct Cloudflare Browser Rendering REST API calls and introduces intelligent content fetching with static/dynamic detection and markdown conversion.

**Core Strategy:**
1. **Smart Content Fetching**: Try local fetch first, detect if content is static/dynamic, fall back to browser rendering only when needed
2. **Screenshot Replacement**: Replace worker screenshot endpoints with direct Cloudflare Browser Rendering API
3. **YouTube Migration**: Replace worker YouTube endpoint with oEmbed API + transcript library
4. **Markdown Conversion**: Convert HTML content to markdown for better storage and processing

**Benefits:**
- Reduce costs (try free fetch first, use browser rendering only when necessary)
- Faster processing (local fetch is instant, no network hops)
- Better content quality (markdown format for cleaner storage)
- Eliminate worker maintenance

---

## Dependencies

**Must be done first:**
1. Environment variables setup (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
2. Package installations (@danielxceron/youtube-transcript, html-to-markdown library)
3. Utility files (screenshot.ts, metadata.ts, content-fetcher.ts) before processor modifications

**Execution order:**
1. env.ts updates
2. package.json updates
3. New utility files creation
4. Processor file modifications (can be done in parallel)
5. turbo.json cleanup

---

## File Changes

### 1. `apps/web/src/lib/env.ts`

**Actions:**
- Add `CLOUDFLARE_API_TOKEN: z.string().min(1)` to environment schema
- Add `CLOUDFLARE_ACCOUNT_ID: z.string().min(1)` to environment schema
- Keep `SCREENSHOT_WORKER_URL` with `.optional()` for gradual migration
- Add comment marking SCREENSHOT_WORKER_URL as deprecated

**Rationale:** Maintain backward compatibility during migration, allow feature flag rollout

---

### 2. `apps/web/package.json`

**Actions:**
- Add dependency: `"@danielxceron/youtube-transcript": "^1.2.3"`
- Add dependency: `"turndown": "^7.2.0"` (HTML to Markdown converter)
- Add dev dependency: `"@types/turndown": "^5.0.5"`

**Rationale:**
- youtube-transcript: Extract YouTube transcripts locally (replace worker endpoint)
- turndown: Convert HTML to markdown for static content
- Well-maintained libraries with TypeScript support

---

### 3. `apps/web/src/lib/cloudflare/screenshot.ts` (NEW FILE)

**Actions:**
- Create `captureScreenshot()` function:
  - Accept options: url, viewport, waitUntil, timeout, fullPage
  - Make POST request to Cloudflare Browser Rendering screenshot API
  - Use `env.CLOUDFLARE_API_TOKEN` and `env.CLOUDFLARE_ACCOUNT_ID`
  - Return Buffer from arrayBuffer response
  - Throw descriptive errors on failure

- Create `capturePDFScreenshot()` function:
  - Accept url parameter only
  - Append hash parameters: `#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
  - Call captureScreenshot with PDF-optimized settings
  - Return Buffer

**Pattern to follow:** Similar to `apps/web/src/lib/aws-s3/aws-s3-upload-files.ts` error handling style

**Edge cases:**
- Handle network timeouts (30s default)
- Handle 429 rate limit errors with descriptive message
- Handle 401 auth errors with token validation hint

---

### 4. `apps/web/src/lib/cloudflare/content-fetcher.ts` (NEW FILE)

**Actions:**
- Create `ContentFetchResult` interface:
  ```typescript
  interface ContentFetchResult {
    markdown: string;
    method: 'fetch' | 'browser-rendering';
    metrics: {
      htmlSize: number;
      wordCount: number;
      hasSpIndicators: boolean;
    };
  }
  ```

- Create `detectContentType()` function:
  - Accept html string parameter
  - Calculate metrics: size, word count (strip HTML tags)
  - Detect SPA indicators: `id="root"`, `id="__next"`, `id="app"`
  - Calculate script-to-content ratio
  - Return score-based decision: 'fetch' or 'browser-rendering'
  - **Algorithm:**
    - Score starts at 0
    - +2 if size > 1000 bytes
    - +3 if word count > 100
    - -3 if has SPA root divs
    - -5 if size < 500 bytes
    - -2 if script ratio > 70%
    - Decision: score >= 3 → 'fetch', else → 'browser-rendering'

- Create `htmlToMarkdown()` function:
  - Use Turndown library to convert HTML to markdown
  - Configure options: headingStyle: 'atx', codeBlockStyle: 'fenced'
  - Strip excessive whitespace
  - Return clean markdown string

- Create `fetchContentAsMarkdown()` function:
  - Accept url and optional options (forceMethod?: 'fetch' | 'browser-rendering')
  - **Step 1**: Try local fetch first (unless forceMethod = 'browser-rendering')
    - Use standard fetch with User-Agent header
    - Get HTML content
  - **Step 2**: Run detectContentType on HTML
  - **Step 3**: If detection says 'fetch' is sufficient:
    - Convert HTML to markdown using htmlToMarkdown
    - Return result with method: 'fetch'
  - **Step 4**: If detection says 'browser-rendering' needed:
    - Call Cloudflare Browser Rendering markdown API
    - Return result with method: 'browser-rendering'
  - Include metrics in response for debugging

- Create `fetchContentAsMarkdownWithBrowserRendering()` helper:
  - Make POST request to Cloudflare Browser Rendering markdown endpoint
  - Endpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/markdown`
  - Request body: `{ url, gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 } }`
  - Parse JSON response and extract markdown content
  - Handle errors gracefully

**Pattern to follow:** Error handling style from `apps/web/src/lib/up-fetch.ts`

**Edge cases:**
- Handle fetch failures (network errors, timeouts)
- Handle invalid HTML (malformed, empty)
- Handle very large pages (>10MB) - truncate or fail gracefully
- Handle redirects (follow up to 5 redirects)
- Log metrics for monitoring which method is used most

---

### 5. `apps/web/src/lib/youtube/metadata.ts` (NEW FILE)

**Actions:**
- Create `YouTubeMetadata` interface:
  ```typescript
  interface YouTubeMetadata {
    title: string;
    author: string;
    thumbnail: string;
    transcript?: string;
  }
  ```

- Create `YouTubeOEmbedSchema` Zod schema:
  - Fields: title, author_name, thumbnail_url (all strings)

- Create `getYouTubeMetadata()` function:
  - Accept videoId and includeTranscript boolean (default true)
  - **Step 1**: Fetch from YouTube oEmbed API
    - URL: `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`
    - Parse response with Zod schema
    - Extract title, author_name
  - **Step 2**: Build thumbnail URL (maxresdefault for high quality)
    - Format: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  - **Step 3**: If includeTranscript is true:
    - Try fetching transcript with `YoutubeTranscript.fetchTranscript(videoId)`
    - Wrap in try-catch (transcript may not exist)
    - Format transcript: `[MM:SS] text` per line
    - Join with newlines
  - **Step 4**: Return metadata object
  - Handle errors gracefully (return partial data if oEmbed fails)

- Create `formatTime()` helper function:
  - Convert seconds to MM:SS format
  - Pad with zeros (e.g., 05:03)

**Pattern to follow:** Similar structure to `apps/web/src/lib/inngest/bookmark-type/process-youtube-bookmark.ts:84-138`

**Edge cases:**
- Video not found (404) - throw descriptive error
- Transcript unavailable - return metadata without transcript
- Private/restricted videos - handle gracefully
- YouTube Shorts - verify transcript library supports them

---

### 6. `apps/web/src/lib/inngest/bookmark-type/process-page-bookmark.ts`

**Actions:**
- **Line ~5**: Add import: `import { captureScreenshot } from '../../cloudflare/screenshot'`
- **Line ~137-144**: Replace screenshot fetching logic:
  - **Old**: Create URL with query params, use `uploadFileFromURLToS3`
  - **New**:
    - Call `captureScreenshot({ url: context.url, viewport: { width: 1920, height: 1080 }, waitUntil: 'networkidle0', timeout: 30000 })`
    - Wrap in try-catch (return null on error for graceful degradation)
    - Use `uploadBufferToS3` instead of `uploadFileFromURLToS3`
    - Pass contentType: 'image/png'
- **Preserve**: Existing fallback chain (extension screenshot → playwright placeholder → screenshot → null)
- **Preserve**: step.run() wrapper for Inngest retry support
- **Consider**: Add logging for which screenshot method was used (extension vs API)

**Pattern to follow:** PDF bookmark processor's buffer upload pattern (line 167-180)

**Testing consideration:** Verify Playwright test placeholder still works (`isPlaywrightTest=true` check)

---

### 7. `apps/web/src/lib/inngest/bookmark-type/process-article-bookmark.ts`

**Actions:**
- **Line ~5**: Add import: `import { captureScreenshot } from '../../cloudflare/screenshot'`
- **Line ~128-135**: Apply same changes as process-page-bookmark.ts
- **Additional consideration**: Articles may have readability parsing - ensure screenshot happens before/after appropriately
- **Preserve**: All existing article metadata extraction logic

**Pattern to follow:** Identical to process-page-bookmark.ts changes

---

### 8. `apps/web/src/lib/inngest/bookmark-type/process-pdf-bookmark.ts`

**Actions:**
- **Line ~5**: Add import: `import { capturePDFScreenshot } from '../../cloudflare/screenshot'`
- **Line ~167-180**: Replace PDF screenshot logic:
  - **Old**: Fetch from worker `/pdf` endpoint, get arrayBuffer
  - **New**: Call `capturePDFScreenshot(context.url)` directly
  - Remove manual fetch and arrayBuffer conversion
  - Keep existing uploadBufferToS3 call (already correct)
- **Preserve**: User-Agent header intent (though not needed with new API)
- **Preserve**: Error handling and logging

**Simplification:** This is the simplest change - direct function replacement

---

### 9. `apps/web/src/lib/inngest/bookmark-type/process-youtube-bookmark.ts`

**Actions:**
- **Line ~5**: Add import: `import { getYouTubeMetadata } from '../../youtube/metadata'`
- **Line ~73-138**: Replace entire `get-video-info` step.run block:
  - **Old**: Fetch from worker `/youtube` endpoint with upfetch + Zod schema
  - **New**:
    - Call `getYouTubeMetadata(youtubeId, !extensionTranscript)`
    - Only fetch transcript if extension didn't provide it
    - Map response to existing return type
    - Change transcriptSource: 'worker' → 'api'
    - Preserve extension transcript priority logic
    - Keep same error handling pattern (fallback to context.url as title)

- **Preserve**:
  - Extension transcript check logic (lines ~60-72)
  - Fallback behavior when metadata fetch fails
  - Metadata structure returned to subsequent steps

- **Consider**: Log which transcript source was used for analytics

**Pattern to follow:** Same step.run() structure, just replace internal implementation

**Edge cases:** YouTube API rate limits (unlikely with oEmbed, but handle gracefully)

---

### 10. `apps/web/src/lib/api-utilities.ts` (NEW FILE - OPTIONAL ENHANCEMENT)

**Actions (if implementing content fetching for bookmarks):**
- Create `extractPageContent()` function:
  - Accept url parameter
  - Call `fetchContentAsMarkdown()` from content-fetcher.ts
  - Store markdown in bookmark content field
  - Log metrics (fetch vs browser-rendering usage)

**Integration point**: Could be called from process-page-bookmark.ts or process-article-bookmark.ts

**Decision needed**: Determine where markdown content should be stored in bookmark schema

---

### 11. `turbo.json`

**Actions:**
- **Line ~22 and ~111**: Remove `SCREENSHOT_WORKER_URL` from env arrays (after migration is complete)
- **OR**: Keep with comment `// Deprecated - remove after worker migration`
- Add `CLOUDFLARE_API_TOKEN` to env arrays where SCREENSHOT_WORKER_URL existed
- Add `CLOUDFLARE_ACCOUNT_ID` to env arrays where SCREENSHOT_WORKER_URL existed

**Timing**: Do this AFTER all processors are migrated and tested

---

### 12. `.env.local` (Local Development)

**Actions:**
- Add `CLOUDFLARE_API_TOKEN=<your-token-here>`
- Add `CLOUDFLARE_ACCOUNT_ID=3eb3623a08be565da5444463c39199c4`
- **DO NOT COMMIT** - verify .gitignore includes .env.local

**Security note**: Use token with minimal permissions (Browser Rendering - Edit only)

---

### 13. `.env.example` (Documentation)

**Actions (if file exists):**
- Add `CLOUDFLARE_API_TOKEN=` with comment explaining how to obtain
- Add `CLOUDFLARE_ACCOUNT_ID=` with example format
- Mark `SCREENSHOT_WORKER_URL` as deprecated

---

## Testing Strategy

### Unit Tests to Create

**File**: `apps/web/src/lib/cloudflare/screenshot.test.ts`
- Test `captureScreenshot()` with valid URL
- Test error handling (invalid URL, network timeout)
- Test `capturePDFScreenshot()` with PDF URL
- Mock Cloudflare API responses

**File**: `apps/web/src/lib/cloudflare/content-fetcher.test.ts`
- Test `detectContentType()` with static HTML (blog, WordPress)
- Test `detectContentType()` with SPA HTML (React app with `<div id="root">`)
- Test `detectContentType()` with heavy script content
- Test `htmlToMarkdown()` conversion quality
- Test `fetchContentAsMarkdown()` decision logic
- Mock fetch responses and Cloudflare API responses

**File**: `apps/web/src/lib/youtube/metadata.test.ts`
- Test `getYouTubeMetadata()` with real video ID (use public video)
- Test with video without transcript
- Test error handling (invalid video ID)
- Test `formatTime()` edge cases (0s, 59s, 3600s)

### Integration Tests to Update

**Existing test files for bookmark processors:**
- Update mocks to use new screenshot functions instead of worker URL
- Verify screenshot upload to S3 still works
- Verify YouTube metadata extraction still works
- Test error fallback chains

### Manual Testing Checklist

- [ ] **Web page screenshot**: Test with https://inngest.com (static-ish site)
- [ ] **SPA screenshot**: Test with React SPA (should detect and use browser rendering)
- [ ] **PDF screenshot**: Test with public PDF URL
- [ ] **YouTube metadata**: Test with video that has transcript (e.g., popular tutorial)
- [ ] **YouTube no transcript**: Test with music video or video without transcript
- [ ] **YouTube Shorts**: Verify support for Shorts URLs
- [ ] **Content fetching - static**: Test with WordPress blog (should use local fetch)
- [ ] **Content fetching - dynamic**: Test with SPA (should use browser rendering)
- [ ] **Error handling**: Test with invalid URLs, timeouts, rate limits
- [ ] **Extension screenshot priority**: Verify extension screenshots still take precedence
- [ ] **Playwright tests**: Verify CI tests still pass with placeholder images

---

## Rollout Considerations

### Phase 1: Setup (Day 1)
1. Install dependencies (`pnpm install`)
2. Create Cloudflare API token with Browser Rendering permissions
3. Add environment variables to local `.env.local` and production environment
4. Deploy environment variable changes to staging

### Phase 2: Implementation (Day 2-3)
1. Create utility files (screenshot.ts, content-fetcher.ts, metadata.ts)
2. Write unit tests for utilities
3. Modify bookmark processors one at a time
4. Test each processor in isolation
5. Run full integration tests

### Phase 3: Gradual Rollout (Day 4-5)
1. Deploy to staging, test thoroughly
2. **Option A - Feature Flag**:
   - Add env var `USE_CLOUDFLARE_API=true/false`
   - Keep both code paths initially
   - Roll out to 10% → 50% → 100%
3. **Option B - Direct Cutover**:
   - Deploy to production in low-traffic window
   - Monitor error rates closely for 24 hours

### Phase 4: Cleanup (Day 6+)
1. Monitor costs and usage for 1 week
2. Verify browser hours stay within included tier (10 hours/month)
3. Remove `SCREENSHOT_WORKER_URL` from env.ts and turbo.json
4. Delete `apps/worker/` directory
5. Remove worker deployment from Cloudflare dashboard

### Migration Safety Net
- Keep worker running for 2 weeks after migration
- If critical issues arise:
  - Revert env variables to use worker
  - Investigate and fix issues
  - Redeploy when ready
- Monitor Cloudflare dashboard for rate limit alerts

---

## Cost Monitoring

**Setup monitoring:**
1. Cloudflare dashboard → Browser Rendering section
2. Check "Browser Hours Used" metric daily for first week
3. Set alert at 8 hours/month (80% of included tier)

**Expected usage (from exploration):**
- ~6.25 hours/month (well within 10 hour included tier)
- Cost: $0/month at current volume
- Only charged if exceeding 10 hours: $0.09/hour overage

**If costs spike unexpectedly:**
- Check for retry loops (Inngest failures causing repeated screenshots)
- Verify content detection is working (should use free fetch for static sites)
- Consider caching screenshot URLs in database (avoid re-screenshots)

---

## Documentation Updates

### README (if applicable)
- Update architecture section to mention Cloudflare Browser Rendering API
- Remove references to worker deployment
- Document new environment variables

### Developer Setup Guide
- Add Cloudflare API token setup instructions
- Link to Cloudflare API token creation: https://dash.cloudflare.com/profile/api-tokens
- Document required permissions: Browser Rendering - Edit

---

## Key Technical Decisions

### 1. Content Fetching Strategy
**Decision**: Two-tier approach (fetch first, browser rendering fallback)
**Rationale**:
- Most sites (blogs, docs, WordPress) are static or SSR → free local fetch works
- Only SPAs and heavy dynamic sites need expensive browser rendering
- Reduces costs by 70-90% (estimated based on typical site distributions)
**Trade-off**: Slight complexity in detection logic, but significant cost savings

### 2. Markdown Conversion Library
**Decision**: Use Turndown library
**Rationale**:
- Well-maintained (7.2k+ stars on GitHub)
- Excellent HTML parsing and markdown output quality
- Configurable (can tune heading styles, code blocks, etc.)
- Used by major projects (notion-to-md, markdownify, etc.)
**Alternative considered**: html-to-markdown (less maintained), unified/rehype (overcomplicated)

### 3. Screenshot Format
**Decision**: Use PNG (not JPEG)
**Rationale**:
- Better quality for UI screenshots (no compression artifacts)
- Transparent backgrounds supported
- Cloudflare API default
**Trade-off**: Larger file sizes (~2-3x vs JPEG), but storage is cheap and quality matters

### 4. Browser Rendering API Endpoint
**Decision**: Use REST API directly (not TypeScript SDK)
**Rationale**:
- SDK adds dependency weight
- REST API is simple (single endpoint)
- More control over request/response handling
- Easier to debug (plain fetch)
**Trade-off**: Manual error handling vs SDK convenience

### 5. YouTube Transcript Source Priority
**Decision**: Extension transcript > API transcript > None
**Rationale**:
- Extension is faster (already extracted)
- Avoid duplicate API calls
- Trust extension quality (we control it)
**Implementation**: Only call `getYouTubeMetadata(videoId, !extensionTranscript)`

### 6. Error Handling Philosophy
**Decision**: Graceful degradation (screenshots/content optional)
**Rationale**:
- Bookmark creation more important than perfect metadata
- Users can manually upload screenshots
- og:image can serve as screenshot fallback
**Pattern**: All screenshot/content errors return null, log warning, continue processing

---

## Success Criteria

### Functional Requirements
- [ ] All bookmark types (page, article, PDF, YouTube) process successfully
- [ ] Screenshots uploaded to S3 with correct format and quality
- [ ] YouTube metadata extracted accurately (title, author, thumbnail, transcript)
- [ ] Content fetching detects static vs dynamic correctly (>90% accuracy)
- [ ] Markdown conversion produces readable output
- [ ] No regression in existing bookmark features
- [ ] Extension screenshots still take priority

### Performance Requirements
- [ ] Screenshot generation < 10 seconds (p95)
- [ ] Content fetching (static) < 2 seconds (p95)
- [ ] Content fetching (dynamic) < 8 seconds (p95)
- [ ] YouTube metadata fetch < 3 seconds (p95)
- [ ] Overall job duration within current benchmarks (+/- 10%)
- [ ] Rate limits respected (no 429 errors)

### Quality Requirements
- [ ] Screenshot quality matches or exceeds current
- [ ] PDF rendering without browser UI (no toolbars)
- [ ] YouTube thumbnails high resolution (maxresdefault.jpg)
- [ ] Transcript formatting preserved with timestamps
- [ ] Markdown output clean and readable (no excessive whitespace or broken formatting)

### Cost Requirements
- [ ] Browser hour usage < 10 hours/month (included tier)
- [ ] Content fetch method: 70%+ use local fetch (free)
- [ ] Actual monthly cost: $0 (within included tier)
- [ ] Alert system active at 80% usage threshold

### Monitoring Requirements
- [ ] Log content detection decisions (fetch vs browser-rendering) for analysis
- [ ] Log screenshot generation time per method
- [ ] Log YouTube API success/failure rates
- [ ] Dashboard showing: browser hours used, fetch method distribution, error rates

---

## Risks and Mitigations

### Risk 1: Content Detection False Positives
**Risk**: Static sites incorrectly detected as dynamic → unnecessary browser rendering costs
**Likelihood**: Medium
**Impact**: High (cost increase)
**Mitigation**:
- Tune detection thresholds based on real-world testing
- Add manual override parameter for specific domains
- Monitor metrics and adjust algorithm
- Test with diverse site samples (top 100 websites)

### Risk 2: Cloudflare API Rate Limits
**Risk**: Hit 180 req/min limit during traffic spikes
**Likelihood**: Low (current volume well below limits)
**Impact**: Medium (bookmark processing delays)
**Mitigation**:
- Inngest handles retries automatically
- Add exponential backoff for 429 errors
- Monitor dashboard for usage patterns
- Consider queuing/batching only if limits reached

### Risk 3: YouTube Transcript Reliability
**Risk**: Transcript library breaks (YouTube changes API)
**Likelihood**: Low-Medium (YouTube changes InnerTube API periodically)
**Impact**: Medium (transcripts missing, but metadata still works)
**Mitigation**:
- Graceful fallback (continue without transcript)
- Monitor error rates
- Have backup plan: switch to alternative library or YouTube Data API v3

### Risk 4: Migration Bugs
**Risk**: Subtle bugs in processor logic cause bookmark failures
**Likelihood**: Medium (4 processors modified)
**Impact**: High (broken bookmark creation)
**Mitigation**:
- Comprehensive integration tests
- Gradual rollout with monitoring
- Keep worker as safety net for 2 weeks
- Feature flag for instant rollback

### Risk 5: Cost Overruns
**Risk**: Browser usage exceeds included tier
**Likelihood**: Very Low (current 6.25h << 10h included)
**Impact**: Low (even 2x overage = $0.50/month)
**Mitigation**:
- Aggressive use of local fetch first
- Monitor daily usage
- Alert at 80% threshold
- Costs are negligible even at 5x volume

---

## Next Steps

1. **Review this plan** - Confirm approach with team
2. **Set up Cloudflare credentials**:
   - Create API token: https://dash.cloudflare.com/profile/api-tokens
   - Permissions: Browser Rendering - Edit
   - Copy account ID from dashboard
3. **Install dependencies**: Run `pnpm install` after adding packages to package.json
4. **Create utility files**: Start with screenshot.ts, then content-fetcher.ts, then metadata.ts
5. **Write tests**: Unit tests for each utility before integration
6. **Modify processors**: One at a time, test each thoroughly
7. **Deploy to staging**: Test full flow end-to-end
8. **Gradual production rollout**: 10% → 50% → 100% over 3 days
9. **Monitor closely**: Check error rates, costs, performance for 1 week
10. **Clean up**: Remove worker code and deprecated env vars

**Recommended command to execute next:**
```bash
/epct:tasks 01-replace-worker-with-cloudflare-api
```

This will break down this plan into small, actionable task files for systematic implementation.

---

**Plan created**: 2025-10-19
**Estimated implementation time**: 3-4 days
**Risk level**: Medium (migration + new features, but well-scoped)
**Cost impact**: Neutral to positive (likely $0/month, reduced complexity)
