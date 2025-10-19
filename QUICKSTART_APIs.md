# Quick Start: API Integration Guide

Fast reference for using the three APIs in your SaveIt.now project.

---

## Installation

### 1. Install YouTube Transcript Library

```bash
cd /Users/melvynx/Developer/saas/saveit.now-mono
pnpm add @danielxceron/youtube-transcript
```

### 2. Set Environment Variables

Create `.env.local` in `apps/web/`:

```bash
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

---

## Usage Examples

### Example 1: Capture Website Screenshot

```typescript
import { captureScreenshotWithRetry } from '@/lib/api-utilities';

export async function captureBookmarkPreview(url: string) {
  const screenshot = await captureScreenshotWithRetry(
    url,
    process.env.CLOUDFLARE_API_TOKEN!,
    process.env.CLOUDFLARE_ACCOUNT_ID!,
    {
      maxRetries: 2,
      waitUntil: 'networkidle2'
    }
  );

  // screenshot is a Buffer with PNG data
  return screenshot;
}
```

### Example 2: Get YouTube Video Info

```typescript
import { getYouTubeMetadataWithCache } from '@/lib/api-utilities';

export async function getVideoInfo(youtubeUrl: string) {
  const metadata = await getYouTubeMetadataWithCache(youtubeUrl);

  return {
    title: metadata.title,
    author: metadata.author_name,
    thumbnail: metadata.thumbnail_url,
    embed: metadata.html,
    width: metadata.width,
    height: metadata.height
  };
}
```

### Example 3: Fetch & Format Transcript

```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { formatTranscript } from '@/lib/api-utilities';

export async function getTranscriptAs(
  videoId: string,
  format: 'json' | 'text' | 'srt' | 'vtt'
) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  return formatTranscript(transcript, format);
}
```

### Example 4: Search Transcript

```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { searchTranscript } from '@/lib/api-utilities';

export async function findInTranscript(
  videoId: string,
  searchQuery: string
) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const results = searchTranscript(transcript, searchQuery, 2);

  return results.map(result => ({
    timestamp: result.entries[1].offset, // Middle entry is the match
    context: result.entries.map(e => e.text).join(' ')
  }));
}
```

---

## Common Tasks

### Task: Create Bookmark with Screenshot

```typescript
import { captureScreenshotWithRetry } from '@/lib/api-utilities';

async function createBookmark(url: string, title: string) {
  try {
    // Capture screenshot
    const screenshot = await captureScreenshotWithRetry(
      url,
      process.env.CLOUDFLARE_API_TOKEN!,
      process.env.CLOUDFLARE_ACCOUNT_ID!
    );

    // Convert to base64 for storage
    const screenshotBase64 = screenshot.toString('base64');

    // Save to database
    const bookmark = await db.bookmark.create({
      data: {
        url,
        title,
        screenshot: screenshotBase64
      }
    });

    return bookmark;
  } catch (error) {
    console.error('Failed to create bookmark:', error);
    throw error;
  }
}
```

### Task: Enrich YouTube Bookmark

```typescript
import {
  getYouTubeMetadataWithCache,
  extractYouTubeVideoId,
  isValidYouTubeUrl
} from '@/lib/api-utilities';

async function enrichYouTubeBookmark(url: string) {
  // Validate it's a YouTube URL
  if (!isValidYouTubeUrl(url)) {
    throw new Error('Not a valid YouTube URL');
  }

  try {
    // Get metadata
    const metadata = await getYouTubeMetadataWithCache(url);

    return {
      title: metadata.title,
      author: metadata.author_name,
      authorUrl: metadata.author_url,
      thumbnail: metadata.thumbnail_url,
      width: metadata.width,
      height: metadata.height,
      html: metadata.html
    };
  } catch (error) {
    console.error('Failed to enrich YouTube bookmark:', error);
    return null;
  }
}
```

### Task: Save Transcript as File

```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { formatTranscript } from '@/lib/api-utilities';
import fs from 'fs/promises';
import path from 'path';

async function saveTranscript(
  videoId: string,
  format: 'srt' | 'vtt' | 'json' = 'srt'
) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const content = formatTranscript(transcript, format);

  // Determine file extension
  const ext = format === 'json' ? 'json' : format;
  const filename = `${videoId}.${ext}`;

  // Save to file
  await fs.writeFile(
    path.join(process.cwd(), 'transcripts', filename),
    content,
    'utf-8'
  );

  return filename;
}
```

---

## Error Handling Patterns

### Pattern 1: Graceful Degradation

```typescript
async function getBookmarkMetadata(url: string) {
  const result: any = { url };

  // Try to get screenshot
  try {
    result.screenshot = await captureScreenshotWithRetry(
      url,
      process.env.CLOUDFLARE_API_TOKEN!,
      process.env.CLOUDFLARE_ACCOUNT_ID!
    );
  } catch (error) {
    console.warn('Screenshot failed:', error);
    result.screenshot = null;
  }

  // Try to get YouTube metadata if it's a YouTube URL
  if (url.includes('youtube.com')) {
    try {
      result.youtube = await getYouTubeMetadataWithCache(url);
    } catch (error) {
      console.warn('YouTube metadata failed:', error);
    }
  }

  return result;
}
```

### Pattern 2: Typed Error Handling

```typescript
async function fetchTranscriptSafely(videoId: string) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return { success: true, transcript };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('empty')) {
      return {
        success: false,
        error: 'NO_TRANSCRIPT',
        message: 'This video has no transcript available'
      };
    }

    if (message.includes('disabled')) {
      return {
        success: false,
        error: 'DISABLED',
        message: 'Transcripts are disabled for this video'
      };
    }

    if (message.includes('429') || message.includes('rate')) {
      return {
        success: false,
        error: 'RATE_LIMITED',
        message: 'Please try again in a few minutes'
      };
    }

    return {
      success: false,
      error: 'UNKNOWN',
      message: 'Failed to fetch transcript'
    };
  }
}
```

---

## Testing Locally

### Test Screenshots

```bash
# Create test script: test-api.ts
import { captureScreenshot } from '@/lib/api-utilities';

async function test() {
  const buffer = await captureScreenshot(
    'https://example.com',
    process.env.CLOUDFLARE_API_TOKEN!,
    process.env.CLOUDFLARE_ACCOUNT_ID!
  );

  console.log(`Screenshot size: ${buffer.length} bytes`);
}

test().catch(console.error);
```

### Test YouTube oEmbed

```bash
import { getYouTubeMetadata } from '@/lib/api-utilities';

async function test() {
  const metadata = await getYouTubeMetadata(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );

  console.log(metadata);
}

test().catch(console.error);
```

### Test Transcripts

```bash
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

async function test() {
  const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ');
  console.log(`Found ${transcript.length} entries`);
  console.log('First entry:', transcript[0]);
}

test().catch(console.error);
```

---

## API Limits Reminder

| API | Limit | What to do if exceeded |
|-----|-------|----------------------|
| Cloudflare Free | 6/min | Wait 10 seconds, use paid plan |
| Cloudflare Paid | 180/min | Usually not an issue |
| YouTube oEmbed | Unmetered* | Cache results 24 hours |
| YouTube Transcript | Unmetered* | Cache results 7 days |

*Unofficially metered - avoid hammering with requests

---

## Debugging Tips

### Enable Detailed Logging

```typescript
// Wrap functions to log
async function captureWithLogging(url: string) {
  console.log(`[Screenshot] Starting capture of ${url}`);
  const startTime = Date.now();

  try {
    const screenshot = await captureScreenshot(
      url,
      process.env.CLOUDFLARE_API_TOKEN!,
      process.env.CLOUDFLARE_ACCOUNT_ID!
    );

    const duration = Date.now() - startTime;
    console.log(`[Screenshot] Success in ${duration}ms, size: ${screenshot.length} bytes`);
    return screenshot;
  } catch (error) {
    console.error(`[Screenshot] Failed after ${Date.now() - startTime}ms:`, error);
    throw error;
  }
}
```

### Check Environment Variables

```typescript
// At app startup
function validateEnv() {
  const required = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }

  console.log('✓ All required environment variables are set');
}
```

---

## Next: Read the Full Documentation

For complete details, see:
- `API_RESEARCH.md` - Full technical documentation
- `RESEARCH_SUMMARY.md` - Detailed reference guide
- `apps/web/src/lib/api-utilities.ts` - Source code with JSDoc

---

## Support for Edge Cases

### PDF URLs with Hash Parameters

```typescript
// Hash parameters are automatically preserved
const pdfUrl = "https://example.com/document.pdf#toolbar=0&page=2";
const screenshot = await captureScreenshot(
  pdfUrl,
  token,
  accountId
);
```

### YouTube Shorts

```typescript
import { extractYouTubeVideoId } from '@/lib/api-utilities';

// All these work:
const id1 = extractYouTubeVideoId('https://www.youtube.com/shorts/ABC123xyz45');
const id2 = extractYouTubeVideoId('https://www.youtube.com/watch?v=ABC123xyz45');
const id3 = extractYouTubeVideoId('ABC123xyz45');

// All return: ABC123xyz45
```

### Multi-Language Transcripts

```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

// Fetch in specific language
const spTranscript = await YoutubeTranscript.fetchTranscript('videoId', {
  lang: 'es'
});
```

---

## Performance Tips

1. **Cache aggressively**
   - Screenshots: 1 hour
   - YouTube metadata: 24 hours
   - Transcripts: 7 days

2. **Batch requests**
   - Process multiple bookmarks concurrently
   - Respect rate limits with Promise.all() limits

3. **Use smaller viewports** for screenshots if full page not needed
   - Reduces processing time
   - Smaller file sizes

4. **Monitor token usage**
   - Track Cloudflare API requests
   - Alert if approaching rate limits

---

## Done! You're ready to integrate.

Start with Example 1 or Example 2, then expand from there.
