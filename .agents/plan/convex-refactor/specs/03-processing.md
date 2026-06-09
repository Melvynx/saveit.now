# Spec 03 — Processing Pipeline (Phase 06)

> **Scope:** Complete analysis of the Inngest-based bookmark processing pipeline for porting to
> Convex actions + scheduler. An implementation engineer must be able to port all behavior without
> re-reading the originals after reading this document.

---

## 1. Current File Inventory and Responsibilities

| File | Responsibility |
|---|---|
| `apps/web/src/lib/inngest/process-bookmark.job.ts` | Orchestrator: limits check → fetch URL content → type routing → cache invalidation |
| `apps/web/src/lib/inngest/bookmark-type/process-tweet-bookmark.ts` | Tweet handler: `react-tweet/api` fetch, image analysis, summary/vectorSummary, tags, R2 avatar, embedding |
| `apps/web/src/lib/inngest/bookmark-type/process-youtube-bookmark.ts` | YouTube handler: oEmbed + transcript, thumbnail analysis fallback, summaries, tags, R2 thumbnail, two embeddings |
| `apps/web/src/lib/inngest/bookmark-type/process-article-bookmark.ts` | Article handler: cheerio + turndown markdown, metadata extraction, Cloudflare screenshot, image analysis, summaries, tags, R2 og-image + favicon, two embeddings |
| `apps/web/src/lib/inngest/bookmark-type/process-product-bookmark.ts` | Product handler: Schema.org/OG extraction, AI fallback extraction, product image analysis, two summaries, tags, R2 image, two embeddings |
| `apps/web/src/lib/inngest/bookmark-type/process-image-bookmark.ts` | Image handler: `sharp` metadata, Gemini vision analysis, title/summary generation, tags, R2 upload, two embeddings |
| `apps/web/src/lib/inngest/bookmark-type/process-pdf-bookmark.ts` | PDF handler: R2 PDF upload, Gemini multimodal analysis, title/summary/detailedSummary, tags, Cloudflare PDF screenshot, two embeddings |
| `apps/web/src/lib/inngest/bookmark-type/process-page-bookmark.ts` | Page handler (default fallback): cheerio + turndown, metadata, Cloudflare screenshot, image analysis, summaries, tags, R2 og-image + favicon, two embeddings |
| `apps/web/src/lib/inngest/prompt.const.ts` | All Gemini prompt string constants (verbatim text that MUST be preserved) |
| `apps/web/src/lib/inngest/process-bookmark.utils.ts` | Shared utilities: `generateAndCreateTags`, `generateContentSummary`, `updateBookmarkWithMetadata`, `splitMarkdownIntoChunks` |
| `apps/web/src/lib/inngest/bookmark-reuse.utils.ts` | Dedupe logic: `findExistingBookmark`, `copyBookmarkData` |
| `apps/web/src/lib/inngest/screenshot-analysis.utils.ts` | Screenshot/image analysis: `analyzeScreenshot`, `analyzeScreenshotBuffer`, `analyzeScreenshotWithPrompt`, `isScreenshotUrlValid` |
| `apps/web/src/lib/inngest/bookmark.utils.ts` | Low-level utils: `getImageUrlToBase64`, `isImageUsable`, `getFaviconUrl`, `splitMarkdownIntoChunks` |
| `apps/web/src/lib/inngest/user-limits-check.ts` | Plan limits check: `isUserOverLimits` — queries subscription + bookmark count + monthly processing runs |
| `apps/web/src/lib/inngest/process-bookmark.step.ts` | Step name/ID constants: `BOOKMARK_STEPS` array with ids and display names |
| `apps/web/src/lib/gemini.ts` | Gemini model configuration, embedding constants, `embedGeminiDocuments`, `embedGeminiQuery` |
| `apps/web/src/lib/youtube/metadata.ts` | YouTube oEmbed + transcript fetcher: `getYouTubeMetadata` |
| `apps/web/src/lib/cloudflare/screenshot.ts` | Cloudflare Browser Rendering API wrapper: `captureScreenshot`, `capturePDFScreenshot` |
| `apps/web/src/lib/aws-s3/aws-s3-upload-files.ts` | R2 upload helpers: `uploadFileToS3`, `uploadBufferToS3`, `uploadFileFromURLToS3` |
| `apps/web/src/lib/aws-s3/aws-s3-client.ts` | S3Client singleton with Cloudflare R2 endpoint |
| `apps/web/src/lib/auth-limits.ts` | Plan limit constants and `getAuthLimits` helper |
| `apps/web/src/lib/database/bookmark-validation.ts` | `validateBookmarkLimits` (called during creation, not just processing) |
| `apps/web/src/lib/server-turndown.ts` | Re-exports `TurndownService` from `turndown` npm package |
| `apps/web/src/lib/bookmark-content.ts` | `getMarkdownContent`, `hasMarkdownContent` — extracts `markdown` field from bookmark metadata |

---

## 2. Orchestrator Logic (process-bookmark.job.ts)

### Entry point
Inngest function `id: "process-bookmark"`, triggered by event `"bookmark/process"` with payload:
```ts
{ bookmarkId: string, userId: string }
```

### Concurrency
`concurrency: { key: "event.data.userId", limit: 1 }` — one job per user at a time.

**Convex equivalent:** The orchestrator action should be scheduled per-user. For v1, idempotent steps + dedupe are sufficient. If needed, a lightweight lock can be implemented via a `processingLocks` document or `userCounters.processing` flag.

### Full Ordered Step Sequence

1. **Check user limits** (`isUserOverLimits`) — BEFORE any DB writes:
   - If `overLimits.isOverLimit == true`: patch bookmark `status: "ERROR"`, `metadata: { error: "Limit exceeded: ..." }`, throw `NonRetriableError`. Do NOT retry.

2. **Fetch bookmark** from DB. If not found, throw.

3. **Update bookmark status**: set `status: "PROCESSING"`, create `BookmarkProcessingRun` with `status: "STARTED"`, save `runId` (→ Convex: no `inngestRunId`; use the Convex scheduled function's `_id` or a generated run ID stored on the bookmark as `processingRunId`).

4. **Validate bookmark limits** (`validateBookmarkLimits` with `skipExistenceCheck: true`) — a secondary check post-creation.

5. **Check existing bookmark** (`findExistingBookmark`) for dedupe — if found:
   - Copy data (`copyBookmarkData`), mark processing run COMPLETED, skip to finish.

6. **Route by URL/content-type**:
   a. If `url.includes("twitter.com") || url.startsWith("https://x.com/")` → `processTweetBookmark` (skip URL fetch)
   b. Else: **Fetch URL content** via `fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } })`. Parse `content-type` header:
      - `text/*` → `content = text`, `type = PAGE`
      - `application/json` → `content = json`, `type = PAGE`
      - `image/*` → `content = arrayBuffer`, `type = IMAGE`
      - `video/*` → `type = VIDEO`
      - `application/pdf` → `content = arrayBuffer`, `type = PDF`
      - Then if `type in [null, PAGE, ARTICLE]` and `isProductPage(url, content)` → override `type = PRODUCT`
      - On fetch failure: set `fetchFailed = true`, `type = PAGE`
   c. If fetch failed → save with minimal data: `status: READY, type: PAGE, title: hostname+pathname, metadata: { fetchFailed: true, fetchError: "Could not retrieve content from URL" }`, mark processing run COMPLETED.
   d. If YouTube video (URL test: `youtube.com || youtu.be` AND `isYouTubeVideo(url)` regex `(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})`) → `processYouTubeBookmark`
   e. If `type == PRODUCT` → `processProductBookmark`
   f. If `type == PAGE` AND `content` is string AND (`content.includes("<article") || content.includes('property="og:type" content="article"')`) → `processArticleBookmark`
   g. If `type == IMAGE` → `processImageBookmark`
   h. If `type == PDF` → `processPDFBookmark`
   i. Default fallback → `processPageBookmark`

7. **onFailure handler**: On any unhandled error — patch bookmark `status: "ERROR"`, `metadata: { error: error.message }`, update `BookmarkProcessingRun.status = "FAILED"`, `failureReason = error.message`, `completedAt = now`.

### Step IDs (for `processingStep` field on bookmark)
These correspond to reactive UI progress display (replaces Inngest Realtime):
```ts
const BOOKMARK_STEPS = [
  { id: "pending",           name: "Pending",              order: 0 },
  { id: "get-bookmark",      name: "Retrieve bookmark",    order: 1 },
  { id: "scrap-content",     name: "Scrapping the content",order: 2 },
  { id: "extract-metadata",  name: "Extract metadata",     order: 3 },
  { id: "summary-page",      name: "Summary the page",     order: 4 },
  { id: "find-tags",         name: "Find relevant tags",   order: 5 },
  { id: "screenshot",        name: "Taking screenshot",    order: 6 },
  { id: "saving",            name: "Saving",               order: 7 },
  { id: "finish",            name: "Finish",               order: 8 },
  { id: "transcript-video",  name: "Transcript video",     order: 9 },
  { id: "describe-screenshot","name": "Describe screenshot",order: 10 },
  { id: "get-tweet",         name: "Get tweet",            order: 11 },
] as const
```
In Convex, `bookmark.processingStep` is a number (0-11); the client maps it back to these step definitions. The detail page uses `useQuery(api.bookmarks.queries.get)` and re-renders as `processingStep` changes.

---

## 3. Plan Limits Logic (user-limits-check.ts / auth-limits.ts)

### Limit constants (must be preserved exactly):
```ts
AUTH_LIMITS = {
  free: {
    bookmarks: 20,
    monthlyBookmarkRuns: 20,
    monthlyChatQueries: 10,
    canExport: 0,
    apiAccess: 0,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarkRuns: 1500,
    monthlyChatQueries: 200,
    canExport: 1,
    apiAccess: 1,
  },
}
```
Custom limits override: user metadata may have `metadata.customLimits` object with any of the limit keys (validated: integer, finite, >= 0). Custom limits take precedence over plan defaults.

### `isUserOverLimits(userId)` algorithm:
1. Find active/trialing subscription for user
2. Get user metadata (for custom limits)
3. Compute effective limits via `getAuthLimits(subscription, metadata)`
4. Count total bookmarks for user (`prisma.bookmark.count({ where: { userId } })`)
5. Count `bookmarkProcessingRun` rows for userId in current calendar month (since `dayjs().startOf("month")`)
6. If `totalBookmarks >= limits.bookmarks` → `isOverLimit: true, reason: "Total bookmarks (...) exceeds plan limit (...)"`
7. If `monthlyBookmarkRuns >= limits.monthlyBookmarkRuns` → `isOverLimit: true, reason: "Monthly processing runs (...) exceeds plan limit (...)"`

**Convex port:** Use a query `internal.billing.plans.assertWithinProcessingLimits(userId)` that reads from the Convex `subscriptions` table and counts `bookmarks` + `bookmarkProcessingRuns` tables. Called at the start of the orchestrator action before any writes.

---

## 4. Dedupe Logic (bookmark-reuse.utils.ts)

### `findExistingBookmark({ url, bookmarkId })`
Finds a READY bookmark that already has the current embedding model (`metadata.embeddingModel == "gemini-embedding-2:1536"`).

**By URL type:**
- **Twitter/X**: exact URL match, `status = "READY"`, `id != bookmarkId`
- **YouTube video**: match by `metadata.youtubeId` field + `type = YOUTUBE`, `status = "READY"`, `id != bookmarkId`
- **All others**: URL match, `status = "READY"`, `id != bookmarkId`. For `type = PAGE` URLs (http), add age restriction: only match if `createdAt >= oneMonthAgo` (1 month lookback window).

Returns: the existing bookmark's `id` if found, else `null`.

**Convex port:** Use index `by_user_url` for URL-based lookups. YouTube dedupe requires metadata lookup — scan with `.withIndex("by_user_url")` won't work for YouTube ID; need a separate query or filter with `.withIndex("by_user")` filtered by `metadata.youtubeId`. Flag this as a gotcha: Convex cannot index into nested JSON, so YouTube dedupe may require a separate `youtubeId` top-level field on the bookmark, or a linear scan limited to YouTube-type bookmarks.

### `copyBookmarkData({ fromBookmarkId, toBookmarkId, url })`
Copies ALL these fields from source to target (in Convex: `ctx.db.patch(toBookmarkId, { ...fields })`):
- `type`, `title`, `summary`, `vectorSummary`, `preview`, `faviconUrl`, `ogImageUrl`, `ogDescription`, `imageDescription`
- `titleEmbedding` (→ will become `searchEmbedding` in Convex since we collapse to one combined embedding)
- `vectorSummaryEmbedding` (→ same as above)
- Sets `status = "READY"`
- Adds `metadata.dataCopiedFrom = fromBookmarkId`

Also copies all tags: inserts `bookmarkTags` rows for all tags from source to target.

Marks `BookmarkProcessingRun.status = "COMPLETED"`, `completedAt = now`.

---

## 5. Gemini Configuration (gemini.ts)

### Model IDs (MUST be exact):
```ts
GEMINI_MODEL_IDS = {
  cheap: "gemini-3.1-flash-lite",
  normal: "gemini-3.1-pro-preview",
  embedding: "gemini-embedding-2",
}
```

### Embedding constants:
```ts
GEMINI_EMBEDDING_DIMENSIONS = 1536
GEMINI_EMBEDDING_CACHE_MODEL = "gemini-embedding-2:1536"   // stored in metadata.embeddingModel
GEMINI_EMBEDDING_METADATA_KEY = "embeddingModel"
GEMINI_EMBEDDING_METADATA_VALUE = "gemini-embedding-2:1536"
```

### Embedding provider options:
```ts
GEMINI_DOCUMENT_EMBEDDING_PROVIDER_OPTIONS = {
  google: {
    outputDimensionality: 1536,
    taskType: "RETRIEVAL_DOCUMENT",
  },
}

GEMINI_QUERY_EMBEDDING_PROVIDER_OPTIONS = {
  google: {
    outputDimensionality: 1536,
    taskType: "RETRIEVAL_QUERY",
  },
}
```

### API:
- `embedGeminiDocuments(values: string[])` → `embedMany({ model, values, providerOptions: DOCUMENT })` — returns `{ embeddings: number[][] }`
- `embedGeminiQuery(value: string)` → `embed({ model, value, providerOptions: QUERY })`
- Uses `@ai-sdk/google` package, `createGoogleGenerativeAI({})` (reads `GOOGLE_GENERATIVE_AI_API_KEY` from env)

### Combined searchEmbedding (Convex target)
**Current state:** Two separate embeddings: `titleEmbedding` and `vectorSummaryEmbedding`. Each handler calls `embedGeminiDocuments([vectorSummary, title])` or `embedGeminiDocuments([title, vectorSummary])` (order varies by handler!).

**Convex target:** ONE combined `searchEmbedding` vector (1536-d) built from:
```
text = title + "\n" + vectorSummary
embedding = embedGeminiDocuments([text])[0]
```
Set `bookmark.embeddingModel = "gemini-embedding-2:1536"`.

This is the single source for the `vectorIndex("by_search_embedding")`.

When `vectorSummary` is empty (fetch failed, no transcript): embed just `title` alone.

---

## 6. All Prompt Constants (prompt.const.ts) — VERBATIM

These strings must be copied exactly. Any change breaks semantic quality.

### USER_SUMMARY_PROMPT
```
<context>
Create a summary of the purpose of the page. This summary will be show in a "bookmark" page. The user just save this website, and we will create the best short, streight summary for this application.
</context>

<goal>
The summary must explain the purpose of the page.
The summary should NOT explain what is inside the page precisely, but more about what is for.
</goal>

<input>
The user will give you the current markdown of the webpage.
</input>

<output>
PLAIN TEXT without any formatting. Just that with what is the page for.
It should be 2-3 sentences maximum.
Start by "It's..."
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. A landing page for Lumail.io, showcasing an AI-powered email marketing tool designed for creators and small businesses. It aims to simplify email marketing and help users focus on selling by offering a fast, simple, and AI-driven platform.
2. A landing page for BeginReact, a comprehensive training program designed for developers to master React and enhance their job prospects in the tech industry. The course offers a structured learning path with interactive workshops, practical exercises, and a supportive community, ensuring a deep understanding of React concepts. With a focus on effective teaching methods, it aims to transform beginners into proficient React developers ready for real-world applications.
3. Landing page for Upstash, a serverless data platform offering a low-latency, scalable key-value store with a focus on ease of use and global accessibility. It provides features like automatic scaling, durable storage, and an HTTP/REST API, making it ideal for developers looking to optimize their applications without server management. The platform supports various use cases, including caching, session management, and real-time data processing.
4. A landing page for Plausible, a simple, lightweight, and privacy-focused web analytics tool designed as an alternative to Google Analytics. It offers intuitive metrics without cookies, ensuring GDPR compliance, and is open source, allowing for self-hosting. The platform is tailored for startups, agencies, and creators, providing essential insights and features for tracking website performance and user engagement.
</examples>
```

### VECTOR_SUMMARY_PROMPT
```
<context>
You are generating a short, keyword-rich summary that captures the full purpose of a web page. This summary will be embedded into a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
Write a dense, 3-4 sentence summary in **English only**, even if the input page is in another language.
The summary must include as many relevant **keywords, brand names, tools, concepts, and use cases** as possible. Focus on what the page is about, who it is for, what value it offers, and how it can be used. Be specific and contextual.
The summary must include as many relevant keywords, tools and use cases that is necessary to understand the full purpose of the page.

**AVOID technical specifications, measurements, dimensions, weights, prices, detailed numerical values, compliance certifications, specific customer company names, specific technology names, platform names, hosting location details, and infrastructure details.** Focus on functionality, purpose, design philosophy, and target audience instead.
**AVOID to replicate what the page say**, we focus only on useful and searchable informations.
**AVOID listing specific company names, platform names, or technology names as examples** - use general descriptions like "web platforms", "development frameworks", or "popular tools".
**AVOID mentioning hosting details, geographic locations, or technical implementation specifics** - focus purely on the purpose and value proposition.

Precise WHAT is the purpose of the page :

<examples>
- A user blog that shows the latest posts, mainly about web development frameworks.
- A landing page to capture leads for a SaaS product.
- A landing page to present courses about creating viral short videos on social media platforms.
</examples>

Precise WHAT is the page about :

<examples>
- An email plateform to send email and transactional marketing at scale.
- A chrome extensions to copy the content of the page in a markdown format, so it's easier to send to LLM.
- A software to send e-mail marketing for SaaS, focus on workflow and automation.
</examples>

Precise WHAT is the "target" :

<examples>
- Target web developers in big companies looking for email services.
- Target new developers that want to learn programming languages.
</examples>

Precise KEYWORD, competitor, example compagny :

<examples>
- It's a competitor to traditional email service providers.
- It's a competitor to popular programming courses and learning platforms.
- It's a template for modern web development with popular frameworks and services.
</examples>

</goal>

<input>
You will receive the Markdown content of a web page.
</input>

<output>
Return **only plain text in English** (no formatting). Limit the output to 3-4 sentences, packed with relevant searchable terms.
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. Resend is an email platform for sending transactional and marketing email. It's for developers that need to send email with a simple developer experience. It offers email template functionality and competes with traditional email service providers.
2. AI Builder Club is a community and learning platform focused on AI coding, AI agents and LLM applications. It offers courses, tools and resources to help developers launch AI products faster with SaaS development resources. It targets those seeking to build AI-powered applications and offers resources for both beginners and experienced developers.
3. Mintlify is an AI-powered documentation platform designed for collaboration and ease of use, targeting startups and enterprises. It enables self-updating knowledge management with a context-aware writer and offers intelligent assistance to users through an AI assistant. It integrates with enterprise knowledge systems, providing compliance and access control features. It helps companies scale their documentation and improve developer experience.
</examples>
```

### TAGS_PROMPT
```
<context>
You are generating exactly 3 tags for a webpage to categorize it in a bookmark database. You must follow strict rules about tag selection and format.

Tag Rules:
1. Always return EXACTLY 3 tags, no more, no less
2. Tags must be in lowercase, single words only (no phrases, spaces, or special characters)
3. First tag: MUST be one content type from this exact list:
   - "landing" (for product/service landing pages)
   - "coderepo" (for code repositories like GitHub/GitLab)
   - "capture" (for screenshots, captures, or temporary content)
   - "documentation" (for technical docs, API docs, guides)
   - "homepage" (for personal/company homepages)
   - "pricing" (for pricing pages)
   - "post" (for blog posts, articles, news)
   - "portfolio" (for portfolios, showcases)
   - "context" (for context/reference pages)
   - "dashboard" (for dashboards, analytics, admin panels)
   - "other" (only if none of the above fit)
4. Second and third tags: Simple theme/technology keywords that describe the main topic (e.g., "software", "courses", "ai", "react", "typescript", "python", "design", "marketing", "productivity", "database", "api", "framework")
</context>

<goal>
Return exactly 3 tags:
1. One content type tag from the list above
2. Two theme/technology tags that best describe the content

Examples:
- GitHub React repository: ["coderepo", "react", "javascript"]
- Stripe pricing page: ["pricing", "payments", "saas"]
- Personal blog post about AI: ["post", "ai", "technology"]
- React documentation: ["documentation", "react", "javascript"]
</goal>

<input>
You will receive the full Markdown content of a web page.
</input>

<output>
Return only a valid JSON array of strings, each tag in lowercase. Example:

["saas", "ai", "chatgpt", "tools", "automation", "notion", "productivity"]

Never return anything else.
</output>
```

### IMAGE_ANALYSIS_PROMPT (used in screenshot-analysis.utils.ts)
```
Analyze this screenshot and provide a detailed description of what you see. Focus on:
- The main content and purpose of the page
- Key visual elements, text, and layout
- Any notable features or interactive elements
- Overall design and user interface elements

If the image appears to be completely black, blank, shows only an error page, captcha, Cloudflare protection, or seems to be an invalid screenshot, use the invalid-image tool instead.
```
The Gemini call uses a tool: `invalid-image` (tool with `reason: string` input). If the model calls `invalid-image`, the result is `{ description: null, isInvalid: true, invalidReason: reason }`. Otherwise `{ description: text, isInvalid: false, invalidReason: null }`.

### IMAGE_SUMMARY_PROMPT
```
<context>
Create a summary of the purpose of the image. This summary will be show in a "bookmarked" image. The user just save this image, and we will create the best short, straight summary for this image.
</context>

<goal>
The summary must explain the purpose of the image.
The summary should NOT explain what is inside the image precisely, but more about what is for.
</goal>

<input>
We will give you the description of the image.
</input>

<output>
PLAIN TEXT without any formatting. Just that with what is the image for.
It should be 2-3 sentences maximum.
Start by "It's..."
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :
```
(Note: the examples list is empty in the current file — no further examples are appended.)

### IMAGE_TITLE_PROMPT
```
<context>
You are generating a title for an image. This title will be show in a "bookmarked" image. The user just save this image, and we will create the best short, straight title for this image.
</context>

<goal>
The title should be 4-5 words maximum.
It should describe the image in a way that is easy to understand.
</goal>

<input>
We will give you the description of the image.
</input>

<output>
Return only the title, 4-5 words maximum, no quotes, no explanation.
</output>
```

### TWEET_SUMMARY_PROMPT
```
<context>
Create a summary of the purpose of the tweet. This summary will be show in a "bookmark" page. The user just save this tweet, and we will create the best short, straight summary for this application.
</context>

<goal>
The summary must explain the purpose of the tweet, what it explain to be easily search.
The summary should NOT explain what is inside the tweet precisely, but more about what is for.
</goal>

<input>
The user will give you the current markdown of the tweet.
</input>

<output>
PLAIN TEXT without any formatting. Just that with what is the page for.
It should be 2-3 sentences maximum.
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. A tweet about an advice from Naval Ravikan explaining how to be successful in life. It emphasise on the importance of being a good person and the value of hard work.
</examples>
```

### TWEET_VECTOR_SUMMARY_PROMPT
```
<context>
Create a summary of the purpose of the tweet. This summary will only be used internally for a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
The summary should explain the purpose of the tweet, what is inside, what is for, what is about, and include a maximum of keywords.
</goal>

<input>
The user will give you the current markdown of the tweet.
</input>

<output>
PLAIN TEXT without any formatting. Just that with what is the page for.
It should be 2-3 sentences maximum.
</output>
```

### YOUTUBE_SUMMARY_PROMPT
```
<context>
Create a summary of the purpose of the youtube video. This summary will be show in a "bookmarked" youtube video. The user just save this video, and we will create the best short, straight summary for this video.
</context>

<goal>
The summary must explain the purpose of the video.
The summary should NOT explain what is inside the video precisely, but more about what is for.
You must create a summary that help the user to search this video.
</goal>

<input>
You will receive the transcript of the youtube video.
</input>

<output>
Return only the summary, 2-3 sentences maximum.
</output>
```

### YOUTUBE_VECTOR_SUMMARY_PROMPT
```
<context>
You are generating a short, keyword-rich summary that captures the full purpose of a youtube video. This summary will be embedded into a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
Write a dense, 3-4 sentence summary in **English only**, even if the input page is in another language. The summary must include as many relevant **keywords, brand names, tools, concepts, and use cases** as possible. Focus on what the page is about, who it is for, what value it offers, and how it can be used. Be specific and contextual.
Precise WHAT is the purpose of the website. Example : A landing page for selling a courses, for capturing leads... A portfolio, a documentation, a blog...
</goal>

<input>
You will receive the transcript of the youtube video.
</input>

<output>
Return **only plain text in English** (no formatting). Limit the output to 3-4 sentences, packed with relevant searchable terms.
</output>
```

### YOUTUBE_THUMBNAIL_ANALYSIS_PROMPT
```
<context>
You are analyzing a YouTube video thumbnail to understand the video content when no transcript is available.
</context>

<goal>
Describe what you see in this YouTube video thumbnail:
- Visual elements (people, objects, scenes, text overlays)
- Style and tone (professional, casual, tutorial, entertainment)
- Topic indicators (tech, cooking, gaming, education, etc.)
- Any text visible in the thumbnail

Be concise but capture the key visual information that hints at the video's content.
</goal>

<output>
Return a 2-3 sentence description of the thumbnail.
</output>
```

### YOUTUBE_NO_TRANSCRIPT_SUMMARY_PROMPT
```
<context>
Create a summary of a YouTube video when no transcript is available. We only have the video title and a visual analysis of the thumbnail.
</context>

<goal>
Based on the title and thumbnail description, infer the purpose and topic of the video.
The summary should help the user remember why they saved this video and find it later.
</goal>

<input>
You will receive:
- The video title
- A description of what's visible in the video thumbnail
</input>

<output>
Return only the summary, 2-3 sentences maximum. Be honest about the limited information.
</output>
```

### YOUTUBE_NO_TRANSCRIPT_VECTOR_SUMMARY_PROMPT
```
<context>
You are generating a keyword-rich summary for a YouTube video when no transcript is available. This summary will be embedded into a vector database to enable semantic search.
</context>

<goal>
Based on the title and thumbnail description, create a dense summary with relevant keywords.
Include the video topic, likely content type (tutorial, review, vlog, etc.), and any visible keywords or themes.
</goal>

<input>
You will receive:
- The video title
- A description of what's visible in the video thumbnail
</input>

<output>
Return **only plain text in English**. Limit to 2-3 sentences packed with searchable terms.
</output>
```

### PDF_SUMMARY_PROMPT
```
<context>
You are an expert in PDF analysis. Your description will be used for further IA to generate a summary.
</context>

<goal>
The summary should explain the purpose of the PDF, what is inside, what is for, what is about, and include a maximum of keywords.
</goal>

<input>
The user will give you the current PDF file and the screenshot description of the PDF.
</input>

<output>
PLAIN TEXT without any formatting.
</output>
```

### PDF_TITLE_PROMPT
```
<context>
You are generating a title for a PDF. This title will be show in a "bookmark" page. The user just save this pdf, and we will create the best short, straight title for this application.
</context>

<goal>
The title should be 4-5 words maximum.
It should describe the PDF in a way that is easy to understand.
</goal>

<output>
Return only the title, 4-5 words maximum, no quotes, no explanation. No formatting.
</output>
```

### PRODUCT_DISPLAY_SUMMARY_PROMPT
```
<context>
Create a simple, memorable summary of what this product DOES for easy reading and quick understanding.
</context>

<goal>
Write a concise 1-2 sentence summary in **English only**. Focus on the core purpose, target users, and main value proposition using simple, everyday language.

**AVOID technical specifications, measurements, dimensions, weights, prices, and detailed numerical values.** Focus on functionality, purpose, and who it's for.

Focus on:
1. The MAIN PURPOSE - what problem does it solve?
2. WHO uses it and WHY they need it
3. KEY concepts and use cases that matter

Be simple and clear. Imagine explaining it to a friend who asks "what's that thing you bookmarked?"
</goal>

<input>
Product information including title, description, price, and metadata.
</input>

<output>
PLAIN TEXT without formatting.
1-2 sentences maximum.
Start with "It's..."
Use everyday language and relevant keywords.
</output>

<examples>
1. It's a card holder that keeps your task cards organized and visible on your desk. Perfect for people who use analog planning systems to stay productive.

2. It's a camera gear organizer that keeps your batteries and memory cards in one place. Made for photographers who need quick access to their accessories.

3. It's noise-canceling headphones for blocking out distractions. Great for anyone who needs to focus while working or traveling.

4. It's a fitness tracker that monitors your daily activity and sleep. Helps health-conscious people stay on top of their wellness goals.
</examples>
```

### PRODUCT_SEARCH_SUMMARY_PROMPT
```
<context>
You are generating a short, keyword-rich summary that captures the full purpose of a product. This summary will be embedded into a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
Write a dense, 3-4 sentence summary in **English only**, even if the input product is in another language. The summary must include as many relevant **keywords, brand names, tools, concepts, and use cases** as possible. Focus on what the product is about, who it is for, what value it offers, and how it can be used. Be specific and contextual.

**AVOID technical specifications, measurements, dimensions, weights, prices, and detailed numerical values.** Focus on functionality, purpose, materials, design philosophy, and target audience instead.

Precise WHAT is the purpose of the product :

- A bag specifically designed for carrying laptops and tech gear
- A todo list analog planner for productivity enthusiasts

Precise WHAT is the product :

- It's a wood and leather backpack with brass hardware and minimalist design
- It's a physical notebook with dated pages, space for goals, and habit tracking with clean aesthetics

Precise WHAT is the "target" :

- It's a premium alternative to high-end laptop bags like Nomatic, Peak Design, and Bellroy
- It's a quality alternative to mainstream earbuds like Apple AirPods
  </goal>

<input>
You will receive the Markdown content of a web page.
</input>

<output>
Return **only plain text in English** (no formatting). Limit the output to 3-4 sentences, packed with relevant searchable terms.
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. This is a minimalist white analog notebook that combines daily dated pages, goal-setting space, and habit tracking for productivity enthusiasts, students, and professionals. Designed as a physical alternative to digital todo list apps like Notion, Todoist, and Trello, it helps users plan work, track progress, and stay focused. With premium paper quality and structured layouts, it functions as a hybrid productivity system for journaling, time management, and self-improvement. Ideal for those who want a tactile, distraction-free planning tool.
2. This is a pair of premium wireless earbuds that deliver immersive spatial audio, world-class active noise cancellation, and crystal-clear call quality for music lovers, frequent travelers, and professionals. With Bluetooth 5.3, multipoint pairing, and customizable EQ through a companion app, they offer deep bass, crisp highs, and adaptive sound tailored to any environment. Built with an ergonomic fit and up to 24 hours of battery life including the charging case, they rival high-end alternatives like Apple AirPods Pro, Sony WF-1000XM5, and Sennheiser Momentum True Wireless. Perfect for commuting, flights, workouts, and office use, they combine luxury design with cutting-edge audio performance.
</examples>
```

---

## 7. Type Handler Details

### 7.1 Tweet Handler (process-tweet-bookmark.ts)

**Prerequisites:** URL matches `twitter.com` or `x.com`. No URL fetch needed.

**External API:** `getTweet(tweetId)` from `react-tweet/api` package. `tweetId` extracted from last segment of URL pathname: `pathname.split("/").pop()`.

**Data shape from `getTweet`:**
```ts
{
  tweetId: string,       // added by us
  text: string,          // tweet content
  user: {
    name: string,
    screen_name: string,
    profile_image_url_https: string,
  },
  mediaDetails?: Array<{
    media_url_https: string,
    type: string,
  }>,
}
```

**Step sequence:**
1. Fetch tweet via `getTweet(tweetId)`. NonRetriableError if not found or ID missing.
2. If tweet has media (`medias[0]`): call `analyzeScreenshot(medias[0].url)` → `tweetImageDescription`.
3. Build `userInput` string:
   ```
   Here is the content of the tweet :
   <tweet-content>
   [JSON.stringify(data)]
   </tweet-content>
   
   Here is the description of the screenshot :
   <screenshot-description>
   [tweetImageDescription]
   </screenshot-description>
   ```
4. If `userInput`: generate `summary` with `TWEET_SUMMARY_PROMPT` and `vectorSummary` with `TWEET_VECTOR_SUMMARY_PROMPT`.
5. Generate tags with `TAGS_PROMPT` + `vectorSummary`.
6. Upload `data.faviconUrl` (= `user.profile_image_url_https`) to R2 at path `users/{userId}/bookmarks/{bookmarkId}/og-image.{ext}` → stored in `faviconUrl`.
7. Call `updateBookmarkWithMetadata`:
   - `type = TWEET`, `title = tweet.user.name`, `vectorSummary`, `summary`, `preview = undefined`, `faviconUrl`, `ogImageUrl = undefined`, `tags`, `imageDescription = tweetImageDescription`, `metadata = tweet` (full tweet object)
8. Embed: `embedGeminiDocuments([vectorSummary])` → ONE embedding; stored as `vectorSummaryEmbedding` today. **Convex:** build combined text = `tweet.user.name + "\n" + vectorSummary`, embed that.

**Edge case:** If no `userInput` (no content, no image): `summary = ""`, `vectorSummary = ""`, embedding step is skipped (`if (!vectorSummary || !summary) return`).

### 7.2 YouTube Handler (process-youtube-bookmark.ts)

**Prerequisites:** URL matches YouTube video regex `(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})`.

**Extension transcript:** Before fetching metadata, check if `bookmark.metadata.transcript` exists (set by Chrome extension during creation). If present, skip API transcript fetch.

**External API: YouTube oEmbed**
```
GET https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={videoId}
Response: { title, author_name, thumbnail_url }
```
Thumbnail constructed as: `https://i.ytimg.com/vi/{videoId}/maxresdefault.jpg` (not from oEmbed).

**External API: YouTube Transcript**
`YoutubeTranscript.fetchTranscript(videoId)` from `@danielxceron/youtube-transcript` package.
Returns `Array<{ offset: number, text: string }>`. Formatted as `[MM:SS] text` per line.

**Thumbnail fallback when no transcript:**
1. Try `https://img.youtube.com/vi/{videoId}/maxresdefault.jpg` (HEAD check)
2. Fallback to `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`
3. Analyze via `analyzeScreenshotWithPrompt(url, YOUTUBE_THUMBNAIL_ANALYSIS_PROMPT)` → `thumbnailAnalysis` string.

**Summary input construction:**
- With transcript: `<title>{title}</title><transcript>{transcript}</transcript>`
- With thumbnail only: `<title>{title}</title><thumbnail_description>{thumbnailAnalysis}</thumbnail_description>`
- Neither: `summary = ""`, `vectorSummary = ""`

**Summary prompts:**
- Transcript available: `YOUTUBE_SUMMARY_PROMPT` (user) + `YOUTUBE_VECTOR_SUMMARY_PROMPT` (vector)
- Thumbnail only: `YOUTUBE_NO_TRANSCRIPT_SUMMARY_PROMPT` (user) + `YOUTUBE_NO_TRANSCRIPT_VECTOR_SUMMARY_PROMPT` (vector)
- Tags: `TAGS_PROMPT` + `summary` (NOT vectorSummary, unlike other handlers)

**R2 upload:** Fetch thumbnail URL → `arrayBuffer()` → `File` object → `uploadFileToS3` at `users/{userId}/bookmarks/{bookmarkId}/og-image.jpg`. Result stored in `preview`.

**Favicon:** Uses static server URL: `${SITE_URL}/favicon/youtube.svg`. In Convex, use `process.env.SITE_URL` or a hardcoded path.

**Metadata stored:**
```ts
{
  ...existingBookmark.metadata,  // preserve extension-provided data (incl. original transcript)
  youtubeId,
  transcriptAvailable: boolean,
  transcriptSource: "extension" | "api" | "none",
  transcript?: string,          // if available
  transcriptExtractedAt?: string, // ISO string
  summarySource: "transcript" | "thumbnail" | "none",
  thumbnailAnalysis?: string,   // if thumbnail used
}
```

**updateBookmarkWithMetadata params:**
```ts
{ type: YOUTUBE, title: videoInfo.title, summary, vectorSummary, preview: ogImageUrl,
  faviconUrl: "${SITE_URL}/favicon/youtube.svg", tags, metadata: finalMetadata }
```

**Embeddings (two in current code):**
```ts
// If no summary AND no vectorSummary: embed title alone
embedGeminiDocuments([videoInfo.title]) → titleEmbedding (only)
// Otherwise: embed both
embedGeminiDocuments([videoInfo.title, vectorSummary]) → [titleEmbedding, vectorSummaryEmbedding]
```
**Convex target:** `embedGeminiDocuments([videoInfo.title + "\n" + vectorSummary])` or just `[videoInfo.title]` if vectorSummary empty.

### 7.3 Article Handler (process-article-bookmark.ts)

**Prerequisites:** `type == PAGE`, HTML contains `<article` OR `property="og:type" content="article"`.

**HTML processing (cheerio + turndown):**
1. Load HTML with cheerio
2. Remove: `script, style, link, meta, noscript, iframe, svg`
3. Extract content: `$("article").html() || $("main").html() || $("body").html()`
4. `TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" })`
5. Convert to markdown, trim

**Metadata extraction (cheerio):**
- Title priority: `og:title` → `twitter:title` → `<title>` → `hostname`
- Favicon priority: `link[rel='icon'][sizes='32x32']` → `link[rel='shortcut icon']` → `link[rel='icon']` → `link[rel='apple-touch-icon']` → `link[rel='apple-touch-icon-precomposed']` → `{origin}/favicon.ico`
  - Relative URLs made absolute with `{origin}{href}`
- OG image: `meta[property='og:image']` (made absolute if relative)
- OG description: `meta[property='og:description']`

**Cloudflare screenshot (Phase 11):**
- Skip if `bookmark.preview` already set (e.g., extension provided preview)
- Call `captureScreenshot({ url, viewport: {width:1920,height:1080}, waitUntil:"networkidle0", timeout:30000 })`
- Validate: buffer length >= 1000 bytes
- Analyze via `analyzeScreenshotBuffer(buffer)` → if `isInvalid`: skip upload, throw to trigger fallback
- Upload to R2: `users/{userId}/bookmarks/{bookmarkId}/screenshot.png`
- Fallback if Cloudflare fails: check `bookmark.preview` again from DB, validate with HEAD request (`isScreenshotUrlValid`)

**Screenshot→preview selection logic:**
```ts
finalPreview = screenshotAnalysis.isInvalid
  ? images.ogImageUrl
  : screenshotAnalysis.description
    ? screenshotUrl  // Cloudflare screenshot
    : images.ogImageUrl
```
Where `screenshotUrl = screenshot ?? pageMetadata.ogImageUrl` (og-image as fallback URL for analysis when screenshot unavailable).

**Summary input:**
```
Here is the content in markdown of the website :
<markdown-content>
{markdown}
</markdown-content>

Here is the description of the screenshot :
<screenshot-description>
{screenshotAnalysis.description}
</screenshot-description>
```
If either is absent, just include the available part. If both absent: `userInput = null`, `summary = ""`, `vectorSummary = ""`.

**Prompts:** `USER_SUMMARY_PROMPT` + `VECTOR_SUMMARY_PROMPT`, `TAGS_PROMPT` + `vectorSummary`.

**R2 uploads:**
- OG image: `users/{userId}/bookmarks/{bookmarkId}/og-image.{ext}` (from `pageMetadata.ogImageUrl`)
- Favicon: `users/{userId}/bookmarks/{bookmarkId}/favicon.{ext}` (from `pageMetadata.faviconUrl`)

**updateBookmarkWithMetadata:**
```ts
{ type: ARTICLE, title: pageMetadata.title, vectorSummary, summary, preview: finalPreview,
  faviconUrl: images.faviconUrl, ogImageUrl: images.ogImageUrl, tags,
  metadata: { articleContent: markdown },
  imageDescription: screenshotAnalysis.description (string) or null }
```

**Embeddings:**
```ts
embedGeminiDocuments([vectorSummary, pageMetadata.title])
// NOTE: order is [vectorSummary, title], so destructuring is [vectorSummaryEmbedding, titleEmbedding]
```
**Convex target:** `embedGeminiDocuments([title + "\n" + vectorSummary])` → single `searchEmbedding`.

### 7.4 Product Handler (process-product-bookmark.ts)

**Prerequisites:** `type == PRODUCT` (detected via `isProductPage(url, html)`)

**`isProductPage(url, html)` detection logic (must preserve exactly):**
1. Schema.org JSON-LD: `@type == "Product"` OR `mainEntity.@type == "Product"` in any `script[type="application/ld+json"]`
2. OpenGraph: `meta[property="og:type"]` content == `"product"`
3. E-commerce URL pattern (`/product/`, `/item/`, `/p/`, `/products/`, `/shop/`, `/buy/`) AND price indicators (`price|cost|\$|€|£|¥|\d+\.\d{2}` in lowercase HTML)
4. E-commerce platform indicators: (Shopify OR WooCommerce) AND (`product` AND `cart`) in HTML, combined with e-commerce URL pattern

**HTML cleaning for markdown (more aggressive than article):**
1. Remove: `script, style, link, meta, noscript, iframe, svg, nav, header, footer, aside, .nav, .header, .footer, .sidebar, [class*='menu'], [class*='navigation'], [id*='menu'], [id*='nav'], [class*='advertisement'], [class*='ads'], [class*='banner']`
2. Remove `img, picture, video, a` completely
3. Try content selectors in order: `article, main, [role='main'], .main-content, .content, #main, #content, .product, .product-detail, .product-info, [itemtype*='Product'], .container` (first with >100 chars text)
4. Fallback to body (with navigation list removal: lists where >3 links AND >70% links/items ratio)
5. TurndownService with link removal rule (keep link text, drop URL)
6. Post-process markdown lines: skip empty, skip <5 chars, skip markdown images/links, skip symbol-only lines, skip breadcrumb patterns, skip URL-only lines, skip dimension strings
7. Limit: content for AI summary truncated to first 2500 chars

**Product metadata extraction — 3-tier priority:**

**Tier 1: `extractProductMetadata(html)` (Schema.org → OG → JS script):**
- JSON-LD `@type == "Product"`: extract `name, offers.price, offers.priceCurrency, brand.name, image[0], offers.availability, description`
- OG fallback: `og:title, product:price:amount (parseFloat), product:price:currency, product:brand, og:image, product:availability, og:description`
- Shopify JS: regex `"product"\s*:\s*({...})`, extract `title, variants[0].price (÷100), vendor`
- Script price regex: `product["\s]*:["\s]*\{([^}]+)\}` with price match
- Final fallback: `h1.text || title.text`

**Tier 2: `extractProductMetadataWithAI(html, url)` (if no price from Tier 1):**
- Extracts: page text (first 4000 chars), `<title>`, `<meta description>`, elements matching `[class*="price"], [id*="price"], [data-price]`
- Calls `generateObject({ model: GEMINI_MODELS.cheap, schema: ProductExtractionSchema, prompt })`
- Schema: `{ name, price?: number, currency?: string, brand?: string, availability?: string, description?: string, category?: string }`
- Prompt format:
  ```
  Extract product information from this e-commerce page:

  <url>{url}</url>

  <page-metadata>
  <title>{title}</title>
  <description>{description}</description>
  </page-metadata>

  <price-elements>
  {priceElements}
  </price-elements>

  <page-content>
  {contentText (first 4000 chars)}
  </page-content>

  Focus on finding the main product being sold, its price, brand, and other key details.
  ```

**Tier 3: Image upload:**
If `traditionalData.image || aiData.image`: upload to R2 at `users/{userId}/bookmarks/{bookmarkId}/products.{ext}`.

**Merge logic:** `name, price, currency, brand, image (uploaded URL), availability, description` from traditional (priority) merging with AI. `category` ALWAYS from AI (AI is better at categorization).

**Product image analysis:** `analyzeScreenshot(productData.image || basicMetadata.image)` → `imageAnalysis`.

**Content for summaries:**
```xml
<product-metadata>
<title>{name || basicMetadata.title}</title>
<description>{description || basicMetadata.description}</description>
<price>{price} {currency}</price>   <!-- only if price present -->
<brand>{brand}</brand>             <!-- only if brand present -->
<category>{category}</category>    <!-- only if category present -->
</product-metadata>

<product-image-description>
{imageAnalysis.description}
</product-image-description>

<website-content>
{markdown first 2500 chars}
</website-content>
```

**Prompts:** `PRODUCT_DISPLAY_SUMMARY_PROMPT` (→ `summary` for display), `PRODUCT_SEARCH_SUMMARY_PROMPT` (→ `vectorSummary` for vector), `TAGS_PROMPT` + `contentForSummary`.

**updateBookmarkWithMetadata:**
```ts
{ type: PRODUCT, title: productData.name || basicMetadata.title || "Product",
  summary: displaySummary, vectorSummary: searchSummary,
  preview: productData.image || basicMetadata.image || null,
  ogImageUrl: productData.image || basicMetadata.image || null,
  metadata: { price, currency, brand, availability, description, category }, tags }
```

**Embeddings:**
```ts
// Uses searchSummary (NOT vectorSummary) as the embedding text
embedGeminiDocuments([searchSummary, titleForEmbedding])
// → [vectorSummaryEmbedding, titleEmbedding]
```
**Convex target:** `embedGeminiDocuments([titleForEmbedding + "\n" + searchSummary])`.

### 7.5 Image Handler (process-image-bookmark.ts)

**Prerequisites:** `type == IMAGE` (content-type `image/*`).

**Dependencies:** `sharp` npm package (Node.js only — `"use node"` required).

**Steps:**
1. `fetch(url)` → `arrayBuffer()` → `sharp(buffer).metadata()` → extract `{ width, height }`
2. Convert to base64: `Buffer.from(buffer).toString("base64")`
3. Gemini vision analysis via `generateText({ model: GEMINI_MODELS.cheap, messages: [{ role: "user", content: [{ type: "text", text: "Analyze this image in detail. Describe what you see, including objects, people, colors, composition, style, and any text visible in the image." }, { type: "image", image: base64Content }] }] })` → `imageAnalysis` text
4. Generate `title` via `generateContentSummary(IMAGE_TITLE_PROMPT, imageAnalysis)` (4-5 words)
5. Generate `summary` via `generateContentSummary(IMAGE_SUMMARY_PROMPT, imageAnalysis)`
6. Generate `vectorSummary` via `generateContentSummary(IMAGE_SUMMARY_PROMPT, imageAnalysis)` — **NOTE: same prompt as summary; effectively identical**
7. Generate tags via `generateAndCreateTags(TAGS_PROMPT, summary, userId)` — uses `summary`, not `vectorSummary`
8. Upload image to R2: `users/{userId}/bookmarks/{bookmarkId}/preview.{ext}`
9. `updateBookmarkWithMetadata({ type: IMAGE, title, summary, vectorSummary, preview: saveImage, tags, metadata: { width, height } })`
10. Embed: `embedGeminiDocuments([title, vectorSummary])` → `[titleEmbedding, vectorSummaryEmbedding]`

**Convex target:** `embedGeminiDocuments([title + "\n" + vectorSummary])`.

### 7.6 PDF Handler (process-pdf-bookmark.ts)

**Steps:**
1. Download PDF: `fetch(url)` → `arrayBuffer()` → upload to R2 at `users/{userId}/bookmarks/{bookmarkId}/pdf-{bookmarkId}-{Date.now()}.pdf` (content-type `application/pdf`). Store `uploadedPdfUrl` and `fileSize`.
2. Re-download PDF for analysis (separate fetch). Gemini multimodal analysis:
   ```ts
   generateText({
     model: GEMINI_MODELS.cheap,
     system: PDF_SUMMARY_PROMPT,
     messages: [{ role: "user", content: [
       { type: "text", text: "Here is the PDF file" },
       { type: "file", data: new Uint8Array(pdfContent), mediaType: "application/pdf" }
     ]}]
   })
   ```
   → `pdfAnalysis` text
3. Title: `generateContentSummary(PDF_TITLE_PROMPT, pdfAnalysis)`. Fallback if empty: `"PDF Document"`
4. `summary = generateContentSummary(USER_SUMMARY_PROMPT, pdfAnalysis)`
5. `detailedSummary = generateContentSummary(VECTOR_SUMMARY_PROMPT, pdfAnalysis)` — uses the generic VECTOR_SUMMARY_PROMPT
6. Tags: `generateAndCreateTags(TAGS_PROMPT, pdfAnalysis, userId)` — uses `pdfAnalysis` directly (not summary)
7. Screenshot: `capturePDFScreenshot(url)` → URL appended with `#toolbar=0&navpanes=0&scrollbar=0&view=FitH`, then `captureScreenshot({viewport: {1920,1080}, waitUntil: "networkidle0", timeout: 30000})`. Upload to R2 at `users/{userId}/bookmarks/{bookmarkId}/pdf-screenshot-{bookmarkId}-{Date.now()}.png`. On failure, `screenshotUrl = null`.
8. `updateBookmarkWithMetadata`:
   ```ts
   { type: PDF, title, summary, vectorSummary: detailedSummary,
     imageDescription: pdfAnalysis,  // full analysis stored as imageDescription
     ogImageUrl: screenshotUrl,
     metadata: { pdfUrl: uploadedPdfUrl, originalUrl: url, fileSize, screenshotUrl },
     tags, status: "READY" }
   ```
9. Embed: `embedGeminiDocuments([title, detailedSummary].filter(Boolean))` → `[titleEmbedding, vectorSummaryEmbedding]`

**Convex target:** `embedGeminiDocuments([title + "\n" + detailedSummary])`.

**Note:** PDF is downloaded TWICE (once for R2, once for analysis). Optimization opportunity: cache the buffer.

### 7.7 Page Handler (process-page-bookmark.ts) — Default Fallback

Identical logic to Article handler with two differences:
1. **Markdown conversion uses `$("body")` instead of `$("article") || $("main") || $("body")`**
2. **Type stored is `PAGE` not `ARTICLE`**

Otherwise the same cheerio/turndown, same Cloudflare screenshot, same analysis, same prompts (`USER_SUMMARY_PROMPT`, `VECTOR_SUMMARY_PROMPT`), same R2 uploads, same embeddings.

**Special Playwright test bypass:**
```ts
if (context.url.includes("isPlaywrightTest=true")) {
  return {
    url: "https://via.placeholder.com/1200x630/f0f0f0/333333?text=Playwright+Test+Placeholder",
    analysis: { description: "Placeholder image for Playwright test", isInvalid: false, invalidReason: null }
  }
}
```
This should be preserved or removed in Convex (remove for production).

---

## 8. Shared Utilities

### `generateAndCreateTags(systemPrompt, prompt, userId)` → `Array<{id, name}>`

1. Fetch all existing user tags (`tag.findMany({ where: { userId } })`)
2. Append to system prompt: `"\n\nExisting user tags: {names}\nPrioritize reusing these existing tags when appropriate before creating new ones."` (only if user has existing tags)
3. `generateObject({ model: GEMINI_MODELS.cheap, schema: z.object({ tags: z.array(z.string()) }), system: enhancedSystemPrompt, prompt })`
4. For each tag name: `tag.upsert({ where: { userId_name: { userId, name } }, create: { name, userId, type: "IA" }, update: {}, select: { id, name } })`
5. Filter out null results, return `[{id, name}]`

**Convex port:** Use `internal.tags.mutations.upsertTag({ userId, name, type: "IA" })` which does idempotent create. The existing tag list query must use index `by_user`.

### `generateContentSummary(systemPrompt, prompt, debugInfo?)` → `string`

Simple wrapper: `generateText({ model: GEMINI_MODELS.cheap, system: systemPrompt, prompt })` → returns `summary.text || ""`.

Debug file writing (only in development, NODE_ENV=development): ignored in Convex.

### `updateBookmarkWithMetadata(params)` → bookmark

Prisma `bookmark.update({ where: { id }, data: { type, title, vectorSummary, faviconUrl, ogImageUrl, ogDescription, imageDescription, summary, preview, status: "READY", metadata, tags: { connectOrCreate: [...] } } })`.

Then if `status == "READY"`: fetch `bookmark.inngestRunId`, update `bookmarkProcessingRun.status = "COMPLETED"`, `completedAt = now`.

**Convex port:** This becomes `internal.processing.steps.applyTypeResult({ bookmarkId, fields })` which `ctx.db.patch`es the bookmark and updates the processing run. Tags are connected via `internal.tags.mutations.setBookmarkTags({ bookmarkId, tagIds })`.

---

## 9. External API Specifications

### Cloudflare Browser Rendering API
- **Endpoint:** `POST https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`
- **Auth:** `Authorization: Bearer {CLOUDFLARE_API_TOKEN}`
- **Request body:**
  ```json
  {
    "url": "...",
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
- **Response:** binary PNG bytes (`arrayBuffer()`)
- **PDF variant:** URL appended with `#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
- **Env vars:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

### Cloudflare R2 (via AWS S3 SDK)
- **Client:** `S3Client({ region: "auto", endpoint: AWS_ENDPOINT, credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY } })`
- **Upload command:** `PutObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: uniqueFileName, Body: buffer, ContentType: contentType })`
- **URL pattern:** `{R2_URL}/{prefix}/{fileName}.{ext}` where R2_URL is the public CDN URL
- **Key path pattern:** `users/{userId}/bookmarks/{bookmarkId}/{type}.{ext}`
- **Env vars:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_ENDPOINT`, `R2_URL`

### Gemini / Google AI SDK
- **Package:** `@ai-sdk/google`, `ai`
- **Init:** `createGoogleGenerativeAI({})` reads `GOOGLE_GENERATIVE_AI_API_KEY`
- **Models used:**
  - `cheap`: `google("gemini-3.1-flash-lite")` — all summaries, tags, product extraction, image analysis
  - `normal`: `google("gemini-3.1-pro-preview")` — not used in processing (defined but only in gemini.ts constants)
  - `embedding`: `google.embeddingModel("gemini-embedding-2")` — embeddings only
- **Embedding API:** `embedMany({ model, values: string[], providerOptions: { google: { outputDimensionality: 1536, taskType: "RETRIEVAL_DOCUMENT" } } })` → `{ embeddings: number[][] }`

### YouTube APIs
- **oEmbed:** `GET https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={videoId}`
  - Response: `{ title, author_name, thumbnail_url }`
- **Transcript:** `@danielxceron/youtube-transcript` package, `YoutubeTranscript.fetchTranscript(videoId)` → `Array<{ offset: number, text: string }>`
- **Thumbnail URLs:**
  - Max resolution: `https://img.youtube.com/vi/{videoId}/maxresdefault.jpg`
  - Fallback: `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`

### react-tweet API
- **Package:** `react-tweet/api`, function `getTweet(tweetId)`
- **No auth required** (uses Twitter's syndication API)
- **Returns:** full tweet object with `text`, `user`, `mediaDetails`, etc.

---

## 10. Target Convex File Structure

```
packages/backend/convex/processing/
  pipeline.ts          # internal action: run(bookmarkId, userId) — orchestrator ("use node")
  steps.ts             # internal mutations: start, finish, fail, patchStep, applyTypeResult, copyFromDuplicate
  limits.ts            # internal query: assertWithinProcessingLimits(userId)
  fetch.ts             # internal action: getUrlContent(url) ("use node")
  dedupe.ts            # internal action: findExistingBookmark(url, bookmarkId) + copyFromDuplicate
  embeddings.ts        # internal action: embed(title, vectorSummary) → searchEmbedding ("use node")
  gemini.ts            # prompt constants + generateContentSummary + generateAndCreateTags helpers
  screenshot.ts        # internal action: captureScreenshot(url) → R2 URL (Phase 11) ("use node")
  types/
    tweet.ts           # internal action: processTweet(bookmarkId, userId, url) ("use node")
    youtube.ts         # internal action: processYouTube(bookmarkId, userId, url) ("use node")
    article.ts         # internal action: processArticle(bookmarkId, userId, url, htmlContent) ("use node")
    product.ts         # internal action: processProduct(bookmarkId, userId, url, htmlContent) ("use node")
    image.ts           # internal action: processImage(bookmarkId, userId, url) ("use node")
    pdf.ts             # internal action: processPdf(bookmarkId, userId, url) ("use node")
    page.ts            # internal action: processPage(bookmarkId, userId, url, htmlContent) ("use node")
```

### Function Signatures

```ts
// pipeline.ts
export const run = internalAction({
  args: { bookmarkId: v.id("bookmarks"), userId: v.string() },
  handler: async (ctx, { bookmarkId, userId }) => { ... }
});

// steps.ts
export const start = internalMutation({
  args: { bookmarkId: v.id("bookmarks"), userId: v.string(), processingRunId: v.string() },
  handler: async (ctx, args) => { ... }
});
export const finish = internalMutation({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, { bookmarkId }) => { ... }  // sets status=READY, run=COMPLETED
});
export const fail = internalMutation({
  args: { bookmarkId: v.id("bookmarks"), error: v.string() },
  handler: async (ctx, args) => { ... }  // sets status=ERROR, run=FAILED
});
export const patchStep = internalMutation({
  args: { bookmarkId: v.id("bookmarks"), step: v.number() },
  handler: async (ctx, { bookmarkId, step }) => { ctx.db.patch(bookmarkId, { processingStep: step }) }
});
export const applyTypeResult = internalMutation({
  args: { bookmarkId: v.id("bookmarks"), fields: v.any() },
  handler: async (ctx, { bookmarkId, fields }) => { ... }
});
export const copyFromDuplicate = internalMutation({
  args: { targetId: v.id("bookmarks"), sourceId: v.id("bookmarks") },
  handler: async (ctx, args) => { ... }  // copies all fields + tags
});

// embeddings.ts ("use node")
export const embed = internalAction({
  args: { title: v.string(), vectorSummary: v.optional(v.string()) },
  returns: v.array(v.float64()),
  handler: async (ctx, { title, vectorSummary }) => {
    const text = vectorSummary ? title + "\n" + vectorSummary : title;
    const { embeddings } = await embedGeminiDocuments([text]);
    return embeddings[0];
  }
});
```

---

## 11. Security / Ownership Guards

All processing functions are `internal` — they cannot be called from client code. Only the bookmark creation mutation (Phase 05) and reprocess action schedule `internal.processing.pipeline.run`.

Guards to implement in `steps.ts`:
- `start`: assert `bookmark.status != "PROCESSING"` (idempotency: don't re-start already-processing bookmarks)
- `start`: assert `bookmark.userId == userId` (ownership)
- `applyTypeResult`: the bookmarkId must exist in the DB (implicit, Convex will throw if not)
- `copyFromDuplicate`: source bookmark must be `status == "READY"` and have valid `searchEmbedding`

Limit checks:
- `assertWithinProcessingLimits` runs BEFORE creating the processing run; throw a custom error if over limit, which `fail` then catches to set `status=ERROR`.

---

## 12. Edge Cases and Gotchas

1. **URL fetch failure:** Entire handler falls back to minimal data (`status=READY, type=PAGE, title=hostname+pathname`). This is NOT an error — the bookmark is saved successfully with minimal info.

2. **Cloudflare screenshot failure:** Fallback chain: Cloudflare → `bookmark.preview` (extension) → `pageMetadata.ogImageUrl` → null preview. Never crash the pipeline on screenshot failure.

3. **Tweet not found:** NonRetriableError — no retry. The bookmark is set to ERROR.

4. **YouTube transcript unavailable:** Handled gracefully — use thumbnail analysis instead. If both fail, `summary = ""` and `vectorSummary = ""`. Still save the bookmark with `title` from oEmbed.

5. **Empty vectorSummary for embedding:** If `vectorSummary` is empty string, embed just the `title`. Never pass an empty string to `embedGeminiDocuments` — it may fail or produce a zero vector.

6. **YouTube dedupe gotcha:** Current code queries `metadata.youtubeId` via Prisma JSON path. In Convex, JSON metadata is not indexable. Solution: add `youtubeId` as a top-level field on the `bookmarks` table (optional string, indexed). Alternatively, accept a linear scan of the user's YouTube bookmarks (bounded by user).

7. **Article vs Page disambiguation:** The distinction is purely in the HTML content check (`<article` tag or `og:type = article`). Same prompts and logic otherwise. Phase 06 spec collapses them as variants of the same handler.

8. **`inngestRunId` → Convex processingRunId:** Current code uses Inngest's `runId` to correlate `BookmarkProcessingRun` rows. In Convex, use the `_id` of the `bookmarkProcessingRuns` document or generate a UUID at `start` time and store it on the bookmark.

9. **Double PDF download:** Current PDF handler downloads the PDF twice (once for R2, once for Gemini analysis). In Convex, download once, store buffer, pass to both steps. Note: Convex action size limit — PDFs >20MB may need streaming. Store buffer temporarily in Convex storage if needed.

10. **`"use node"` discipline:** ALL type handlers use `sharp`, `Buffer`, Node streams, AWS SDK, and `react-tweet/api`. All must be in separate `"use node"` action files. `steps.ts` (mutations) must NOT have `"use node"`. `gemini.ts` prompt constants can be in a plain module shared by both.

11. **Concurrency — per-user serialization:** Inngest uses `concurrency: { key: userId, limit: 1 }`. Convex scheduler does not have built-in per-key concurrency. For v1, rely on idempotency (check `status != "PROCESSING"` in `start`). If a second job is scheduled for the same user while one is running, the `start` mutation guard will detect it and the second can self-cancel or wait. A simple `processingLocks` table can be added if needed.

12. **Gemini rate limits:** `generateAndCreateTags`, `generateContentSummary`, and `embedGeminiDocuments` are all sequential in current code. In Convex, they remain sequential within an action. Add retry/backoff around Gemini calls in the action (use `retryCount` pattern or schedule a retry action).

13. **Cache invalidation:** Current code calls `CacheInvalidation.onBookmarkUpdated(bookmark)` after every handler — this invalidates the Upstash Redis search cache. In Convex, there is no Redis cache. Convex reactive queries handle real-time updates automatically. No cache invalidation step needed.

14. **Metadata `articleContent` field:** Article handler stores `metadata: { articleContent: markdown }`. The `bookmark-content.ts` file has helpers `getMarkdownContent` and `hasMarkdownContent` that read `metadata.markdown` — not `metadata.articleContent`. This is a field name inconsistency in the current code. Port `articleContent` as-is and align the reader.

15. **Product image analysis `null` safety:** `analyzeScreenshot` can return `{ description: null, isInvalid: false, invalidReason: null }` if URL is null or fetch fails. All downstream code must handle `imageAnalysis?.description` being null.

16. **Screenshot validity check (`isScreenshotUrlValid`):** Uses `HEAD` request with 5-second timeout. Checks: `response.ok`, `content-length >= 1000` bytes. In Convex, this logic moves to the `screenshot.ts` action in Phase 11.

17. **`SITE_URL` dependency (YouTube favicon):** YouTube bookmark's `faviconUrl` is set to `${getServerUrl()}/favicon/youtube.svg`. In Convex, this should be `process.env.SITE_URL + "/favicon/youtube.svg"` or a hardcoded CDN URL. Ensure `SITE_URL` env var is set in Convex.

18. **Product price = 0 handling:** `extractProductMetadata` returns `price: 0` (from `parseFloat("0")`) if the OG price attribute is present but empty. The fallback AI extraction is triggered only when `!traditionalData.price || traditionalData.price <= 0` — so price = 0 triggers AI fallback.

19. **Tag creation race conditions:** Multiple concurrent bookmarks for the same user could create duplicate tags if the `upsert` is not atomic. Prisma `upsert` with `userId_name` unique constraint handles this. In Convex, implement idempotent tag creation using `.withIndex("by_user_name")` query + conditional insert — Convex mutations are serialized so no TOCTOU race.
