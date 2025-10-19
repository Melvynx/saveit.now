# API Research Summary

Complete research and documentation for integrating Cloudflare Browser Rendering, YouTube oEmbed, and YouTube Transcript APIs.

## Files Created

### 1. **API_RESEARCH.md** (Root)
Complete documentation with:
- Official API documentation links
- Request/response formats
- Authentication methods
- Rate limits and error handling
- Code examples for each API
- Best practices
- Environment variables setup

**Location**: `/Users/melvynx/Developer/saas/saveit.now-mono/API_RESEARCH.md`

### 2. **api-utilities.ts** (Production)
Production-ready TypeScript utilities with:
- Fully typed interfaces
- Error handling and retry logic
- Timeout management with AbortController
- Caching implementations
- Binary response handling
- Format conversion utilities

**Location**: `/Users/melvynx/Developer/saas/saveit.now-mono/apps/web/src/lib/api-utilities.ts`

---

## Quick Reference

### Cloudflare Browser Rendering API

**Endpoint**: `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/browser-rendering/screenshot`

**Authentication**: Bearer token (get from Cloudflare dashboard with "Browser Rendering - Edit" permission)

**Rate Limits**:
- Free: 6 req/min
- Paid: 180 req/min

**Key Options**:
- `viewport`: { width, height }
- `waitUntil`: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
- `timeout`: milliseconds (max 60000)
- `fullPage`: boolean
- `omitBackground`: boolean
- `clip`: { x, y, width, height }

**Response**: Binary PNG image data

**Utilities**:
```typescript
import { captureScreenshot, captureScreenshotWithRetry } from '@/lib/api-utilities';

const buffer = await captureScreenshot(url, apiToken, accountId, {
  viewport: { width: 1280, height: 720 },
  waitUntil: 'networkidle2',
  omitBackground: true
});
```

---

### YouTube oEmbed API

**Endpoint**: `GET https://www.youtube.com/oembed`

**Parameters**:
- `url`: YouTube video URL (required)
- `maxwidth`: optional
- `maxheight`: optional
- `format`: 'json' (default)

**Response Fields**:
- `title`: string
- `author_name`: string (channel name)
- `author_url`: string
- `thumbnail_url`: string
- `html`: iframe embed code
- `width`, `height`: recommended dimensions

**Supported URL Formats**:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- Direct video ID

**Utilities**:
```typescript
import {
  getYouTubeMetadata,
  getYouTubeMetadataWithCache,
  extractYouTubeVideoId,
  isValidYouTubeUrl
} from '@/lib/api-utilities';

// With automatic caching (24 hours)
const metadata = await getYouTubeMetadataWithCache('dQw4w9WgXcQ');

// Extract video ID from any format
const videoId = extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ');
```

---

### YouTube Transcript API

**Library**: `@danielxceron/youtube-transcript`

**Features**:
- HTML scraping + InnerTube API fallback
- YouTube Shorts support
- Multiple URL format support
- TypeScript types included

**Installation**:
```bash
npm install @danielxceron/youtube-transcript
```

**Usage**:
```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

// Fetch transcript
const transcript = await YoutubeTranscript.fetchTranscript('VIDEO_ID_OR_URL');

// Result: TranscriptEntry[]
// { text: string, offset: number, duration: number, lang?: string }
```

**Error Handling**:
- Videos with no transcript: throws error containing "empty"
- Transcripts disabled: throws error containing "disabled"
- Rate limited: throws error containing "429" or "rate"

**Utility Functions** (in api-utilities.ts):
```typescript
import {
  transcriptToText,      // Plain text
  transcriptToSRT,       // SRT subtitle format
  transcriptToVTT,       // VTT subtitle format
  formatTranscript,      // Any format
  searchTranscript,      // Search with context
  summarizeTranscript    // Get summary
} from '@/lib/api-utilities';
```

---

## Environment Setup

### Required Environment Variables

```bash
# .env.local or .env.production

# Cloudflare Browser Rendering
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Optional: Cache durations (milliseconds)
SCREENSHOT_CACHE_TTL=3600000      # 1 hour
METADATA_CACHE_TTL=86400000       # 24 hours
TRANSCRIPT_CACHE_TTL=604800000    # 7 days
```

### Getting Credentials

**Cloudflare**:
1. Login to Cloudflare dashboard
2. Go to Profile → API Tokens
3. Create token with "Browser Rendering - Edit" permission
4. Find Account ID in Cloudflare dashboard

**YouTube**: No authentication required (public APIs)

---

## API Patterns & Best Practices

### 1. Screenshot Capture

```typescript
// Basic
const screenshot = await captureScreenshot(url, token, accountId);

// With retry (exponential backoff)
const screenshot = await captureScreenshotWithRetry(
  url,
  token,
  accountId,
  { maxRetries: 3 }
);

// As base64 for embedding
const base64 = await captureScreenshotAsBase64(url, token, accountId);
```

### 2. Binary Response Handling

The utilities handle binary data conversion:
- Modern approach: `response.arrayBuffer()` → `Buffer.from()`
- Streaming approach: `response.body.getReader()` for large files
- Automatic timeout with AbortController

### 3. Bearer Token POST Requests

```typescript
// Standard pattern used throughout
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload),
  signal: controller.signal  // For timeout
});
```

### 4. Error Handling

```typescript
try {
  const screenshot = await captureScreenshot(url, token, accountId);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('429')) {
      // Rate limited
    } else if (error.message.includes('timeout')) {
      // Request timeout
    } else if (error.message.includes('HTTP 4')) {
      // Client error (bad request)
    } else if (error.message.includes('HTTP 5')) {
      // Server error (retry)
    }
  }
}
```

### 5. Caching Strategies

**YouTube Metadata**: 24 hours (stable, rarely changes)
**Screenshots**: 1 hour (time-sensitive, may vary by page)
**Transcripts**: 7 days (stable, only updated when captions change)

Built-in caching in utilities uses `Map` and `setTimeout` for TTL.

---

## PDF URL Handling with Hash Parameters

YouTube and PDF services support hash parameters to control display:

```typescript
// Hash parameters are preserved in the URL
const pdfWithToolbar = "https://example.com/doc.pdf#toolbar=0&page=1";

const screenshot = await captureScreenshot(
  pdfWithToolbar,
  token,
  accountId
);
// Hash parameters are sent to Cloudflare API as-is
```

Common PDF parameters:
- `toolbar=0`: Hide toolbar
- `page=1`: Start at page 1
- `zoom=150`: Set zoom level

---

## Rate Limits Summary

| API | Limit | Period | Retry Strategy |
|-----|-------|--------|-----------------|
| Cloudflare (Free) | 6 req/min | Per account | Exponential backoff |
| Cloudflare (Paid) | 180 req/min | Per account | Exponential backoff |
| YouTube oEmbed | Unmetered* | ~per second | Respect reasonable frequency |
| YouTube Transcript | Unmetered* | HTML scraping works everywhere; InnerTube API on client/local servers |

*Unofficial APIs - respect reasonable request frequency to avoid being blocked

---

## Transcript Format Examples

### Input
```typescript
const transcript = [
  { text: "Hello", offset: 0, duration: 2 },
  { text: "World", offset: 2, duration: 1.5 }
];
```

### JSON Output
```json
[
  { "text": "Hello", "offset": 0, "duration": 2 },
  { "text": "World", "offset": 2, "duration": 1.5 }
]
```

### SRT Output
```
1
00:00:00,000 --> 00:00:02,000
Hello

2
00:00:02,000 --> 00:00:03,500
World
```

### VTT Output
```
WEBVTT

00:00:00.000 --> 00:00:02.000
Hello

00:00:02.000 --> 00:00:03.500
World
```

### Plain Text Output
```
Hello World
```

---

## Common Integration Scenarios

### Scenario 1: Bookmark Screenshot & Preview

```typescript
import { captureScreenshotWithRetry } from '@/lib/api-utilities';

async function createBookmarkPreview(url: string) {
  try {
    const screenshot = await captureScreenshotWithRetry(
      url,
      process.env.CLOUDFLARE_API_TOKEN!,
      process.env.CLOUDFLARE_ACCOUNT_ID!,
      { maxRetries: 3 }
    );

    // Save to S3 or database
    return screenshot;
  } catch (error) {
    console.error('Failed to capture preview:', error);
    return null;
  }
}
```

### Scenario 2: YouTube Video Metadata

```typescript
import { getYouTubeMetadataWithCache } from '@/lib/api-utilities';

async function enrichYouTubeBookmark(youtubeUrl: string) {
  try {
    const metadata = await getYouTubeMetadataWithCache(youtubeUrl);

    return {
      title: metadata.title,
      thumbnail: metadata.thumbnail_url,
      author: metadata.author_name,
      embed: metadata.html
    };
  } catch (error) {
    console.error('Failed to get metadata:', error);
    return null;
  }
}
```

### Scenario 3: YouTube Transcript Search

```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { searchTranscript } from '@/lib/api-utilities';

async function searchVideoTranscript(videoId: string, query: string) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const results = searchTranscript(transcript, query, 2); // 2 lines context

    return results; // Array of matching segments with context
  } catch (error) {
    console.error('Failed to search transcript:', error);
    return [];
  }
}
```

---

## Testing & Validation

### Test YouTube URL Extraction

```typescript
import { extractYouTubeVideoId } from '@/lib/api-utilities';

const testCases = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  'dQw4w9WgXcQ'
];

testCases.forEach(url => {
  const id = extractYouTubeVideoId(url);
  console.log(`${url} → ${id}`);
  // All should output: dQw4w9WgXcQ
});
```

### Test Transcript Formatting

```typescript
import { formatTranscript } from '@/lib/api-utilities';

const transcript = [
  { text: "Test", offset: 0, duration: 1 }
];

console.log(formatTranscript(transcript, 'text'));   // "Test"
console.log(formatTranscript(transcript, 'json'));   // JSON string
console.log(formatTranscript(transcript, 'srt'));    // SRT format
console.log(formatTranscript(transcript, 'vtt'));    // VTT format
```

---

## Troubleshooting

### Screenshot Not Capturing
- Check `waitUntil` option (use 'networkidle2' for dynamic content)
- Increase `timeout` (default 30000ms)
- Verify `viewport` dimensions are reasonable
- Check rate limits (429 response)

### YouTube Metadata Returns 404
- Verify video is public (not private/deleted)
- Check URL format is correct
- Extract and validate video ID

### Transcript Fetch Fails
- Some videos have transcripts disabled
- Auto-generated captions may not be available
- Verify video URL is valid
- Check for rate limiting on InnerTube API

### Rate Limiting
- Implement exponential backoff (already in retry functions)
- Cache results appropriately
- Batch requests where possible
- Use Paid plan for higher limits

---

## Security Considerations

1. **API Tokens**: Never commit to git, use environment variables
2. **Binary Data**: Validate Content-Type headers
3. **URL Validation**: Extract and validate YouTube IDs before requests
4. **Timeout Handling**: Always use AbortController for long operations
5. **Error Messages**: Don't expose internal API errors to clients

---

## Next Steps

1. Review `/Users/melvynx/Developer/saas/saveit.now-mono/API_RESEARCH.md` for complete details
2. Import utilities from `/Users/melvynx/Developer/saas/saveit.now-mono/apps/web/src/lib/api-utilities.ts`
3. Set up environment variables in `.env.local`
4. Test each API with provided code examples
5. Implement caching strategy based on your use case
6. Add error handling as shown in scenarios

---

## References

- **Cloudflare Docs**: https://developers.cloudflare.com/browser-rendering/
- **YouTube oEmbed**: https://www.youtube.com/oembed
- **YouTube Transcript**: https://www.npmjs.com/package/@danielxceron/youtube-transcript
- **oEmbed Standard**: https://oembed.com/
