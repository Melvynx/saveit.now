# Phase 06 — Bookmark Processing Pipeline (Inngest → Convex)

**Goal:** reimplement the full bookmark processing pipeline as Convex actions + scheduler, with all 7
type handlers, embeddings, and **reactive** progress (no Inngest, no realtime tokens).

**Current logic to port:** `apps/web/src/lib/inngest/process-bookmark.job.ts` and
`apps/web/src/lib/inngest/bookmark-type/{tweet,youtube,article,product,image,pdf,page}.ts`,
plus `gemini.ts`, `cloudflare/screenshot.ts`, `aws-s3/*`, `youtube/*`.

**Depends on:** Phase 04 (schema), 05 (create schedules the pipeline), 11 (R2 + Cloudflare actions).

---

## Architecture: orchestrator action + step mutations

Inngest "steps" become: one **orchestrator action** that calls small **internal mutations** to persist
progress, and **internal actions** for external I/O. Convex mutations are transactions — never do
network/CPU work inside them.

```
internal.processing.pipeline.run(action)            # orchestrator (entry; scheduled by create/reprocess)
  → internal.processing.steps.start(mutation)        # status PROCESSING, create processingRun, step=1
  → assertWithinLimits (read)                         # monthly run quota
  → dedupe: bookmarks.queries.findReadyByUrl          # copy existing data if duplicate (skip work)
  → internal.processing.fetch.getUrlContent(action)   # HEAD/GET, detect content type
  → route to type handler (internal actions):
       types.tweet / types.youtube / types.article /
       types.product / types.image / types.pdf / types.page
  → internal.processing.embeddings.embed(action)      # Gemini → searchEmbedding (combined)
  → internal.processing.steps.finish(mutation)        # status READY, processingRun COMPLETED, step=done
  (onError) internal.processing.steps.fail(mutation)  # status ERROR, processingRun FAILED, processingError
```

Each step mutation also `ctx.db.patch`es `bookmark.processingStep` (a number/enum). The detail page's
`useQuery(api.bookmarks.queries.get)` re-renders automatically → this replaces Inngest Realtime.

> Concurrency: the current job is `concurrency: 1 per userId`. In Convex, serialize per-user with a
> lightweight lock (a `processingLocks` row or a `userCounters.processing` flag) or rely on the
> scheduler + idempotent steps. For v1, idempotent steps + dedupe are sufficient; add a per-user lock
> only if rate spikes cause duplicate processing.

## Type handlers (each an internal action in `convex/processing/types/*.ts`, `"use node"`)

Port behavior 1:1 from `apps/web/src/lib/inngest/bookmark-type/`:

- **tweet.ts** — `getTweet` from `react-tweet/api`; Gemini summary + tags; upload avatar to R2;
  store `tweetId` + tweet data in `metadata`. Type `TWEET`.
- **youtube.ts** — oEmbed metadata + transcript (`@danielxceron/youtube-transcript`, or the
  client-supplied `transcript` arg from the extension); Gemini summary/vectorSummary/tags; R2 thumbnail.
  Type `YOUTUBE`. (Cloudflare screenshot not needed.)
- **article.ts** — `cheerio` parse, `turndown` → markdown into `metadata.articleContent`; Cloudflare
  screenshot (Phase 11); Gemini analyze screenshot + summary/vectorSummary/tags; R2 og-image + favicon.
  Type `ARTICLE`.
- **product.ts** — schema.org extraction; Gemini structured product extraction; Cloudflare screenshot.
  Type `PRODUCT`.
- **image.ts** — `sharp` metadata; Gemini vision description; summary/tags; R2 upload. Type `IMAGE`.
- **pdf.ts** — R2 upload of the PDF; Gemini multimodal PDF analysis (title/summary/tags); Cloudflare
  PDF screenshot. Type `PDF`.
- **page.ts** — default fallback = article without article-specific detection. Type `PAGE`.

Shared helpers in `convex/processing/`:
- `embeddings.ts` (`"use node"`) — `embedGemini(text)` using `@ai-sdk/google` `textEmbeddingModel`
  (`gemini-embedding-2`, 1536 dims, task `RETRIEVAL_DOCUMENT`). Build `searchEmbedding` from
  `title + "\n" + vectorSummary`. Set `embeddingModel = "gemini-embedding-2:1536"`.
- `gemini.ts` — the prompt constants (USER_SUMMARY_PROMPT, VECTOR_SUMMARY_PROMPT, TAGS_PROMPT, image/pdf
  analysis) ported from `apps/web/src/lib/gemini.ts`. Tag generation upserts via `tags.create` +
  `setBookmarkTags` (internal variants).
- `screenshot.ts` / `storage.ts` — see Phase 11 (Cloudflare API + R2).

## Step mutations (`convex/processing/steps.ts`, plain mutation)
`start`, `finish`, `fail`, `patchStep`, `applyTypeResult({ bookmarkId, fields })`,
`copyFromDuplicate({ targetId, sourceId })`. All assert internal-only (called from the action).

## Dedupe
Port `check-existing-bookmark` + `copy-existing-bookmark-data`: if a READY bookmark with the same
`(userId, url)` exists, copy `title/summary/vectorSummary/preview/searchEmbedding/metadata/tags` and
skip processing. Use `by_user_url`.

## Tag generation
The pipeline creates AI tags (`type: "IA"`). Reuse `tags.create` (idempotent on `(userId, name)`) +
`setBookmarkTags` from Phase 05 as **internal** mutations.

## Acceptance criteria
- Saving each of the 8 URL kinds produces the right `type`, summary, tags, preview, and a
  `searchEmbedding`; `bookmarkProcessingRuns` row transitions STARTED→COMPLETED.
- The detail page shows step progress live with no extra wiring.
- Failures set `status=ERROR` + `processingError` and mark the run FAILED.
- Duplicate URL copies existing data without re-calling Gemini/Cloudflare.

## Risks
- **Action timeouts / size**: keep per-step actions small; pass IDs, not large blobs. PDFs/images go to
  R2, store only URLs in `metadata`.
- **Gemini rate limits**: batch embeddings; add retry/backoff in actions.
- **Idempotency**: steps must be safe to re-run (scheduler retries) — guard on current `status`.
- **`"use node"` discipline**: type handlers and embeddings are Node actions; the step persistence is a
  separate non-node mutation file.
