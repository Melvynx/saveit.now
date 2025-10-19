# API Research & Integration Guide

## 1. Cloudflare Browser Rendering API

### Overview
The Cloudflare Browser Rendering API provides REST endpoints for browser automation tasks including screenshot capture, PDF generation, and HTML content extraction. It renders webpages with full JavaScript execution.

### Official Documentation
- **Docs**: https://developers.cloudflare.com/browser-rendering/
- **Screenshot Endpoint**: https://developers.cloudflare.com/browser-rendering/rest-api/screenshot-endpoint/
- **API Reference**: https://developers.cloudflare.com/api/resources/browser_rendering/subresources/screenshot/methods/create/

### Authentication

```typescript
// Bearer token authentication required
// Get token from Cloudflare dashboard with "Browser Rendering - Edit" permissions

const headers = {
  'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
  'Content-Type': 'application/json'
};
```

### Endpoint & Request Format

```
POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/browser-rendering/screenshot
```

#### Request Body

```json
{
  "url": "https://example.com",
  "html": "optional HTML content",
  "screenshotOptions": {
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "fullPage": false,
    "omitBackground": true,
    "clip": {
      "x": 0,
      "y": 0,
      "width": 1280,
      "height": 720
    },
    "captureBeyondViewport": false
  },
  "gotoOptions": {
    "waitUntil": "networkidle2",
    "timeout": 30000
  }
}
```

#### Key Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` or `html` | string | URL to screenshot OR raw HTML content (one required) |
| `viewport` | object | Viewport dimensions {width, height} |
| `fullPage` | boolean | Capture entire page height, not just viewport |
| `omitBackground` | boolean | Transparent background instead of white |
| `clip` | object | Crop region {x, y, width, height} |
| `captureBeyondViewport` | boolean | Capture beyond visible viewport |
| `waitUntil` | string | Page load condition: `load`, `domcontentloaded`, `networkidle0`, `networkidle2` |
| `timeout` | number | Max wait time in milliseconds (default 30000, max 60000) |

### Response Format

Binary PNG image data with headers:
```
Content-Type: image/png
```

### Rate Limits

**Free Plan:**
- 6 requests per minute
- 10 minutes total daily usage

**Paid Plan:**
- 180 requests per minute
- Unlimited daily usage

### Error Responses

```json
{
  "success": false,
  "errors": [
    {
      "code": 8000020,
      "message": "Invalid request"
    }
  ]
}
```

### Common Error Codes
- `8000001` - Authentication failed
- `8000020` - Invalid request format
- `8000021` - Timeout exceeded
- `8000022` - Page load failed

### PDF URLs with Hash Parameters

When capturing PDFs with hash parameters like `#toolbar=0`:

```typescript
// Hash parameters are preserved in the URL
const pdfUrl = "https://example.com/document.pdf#toolbar=0&page=1";

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/screenshot`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: pdfUrl,
      screenshotOptions: {
        viewport: { width: 1280, height: 720 },
        omitBackground: false
      }
    })
  }
);

const imageBuffer = await response.arrayBuffer();
```

### Code Examples

#### Basic Screenshot from URL

```typescript
async function captureScreenshot(url: string): Promise<Buffer> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        screenshotOptions: {
          viewport: { width: 1280, height: 720 },
          omitBackground: true
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Screenshot failed: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
```

#### Advanced: Full Page Screenshot with Wait Condition

```typescript
async function captureFullPageScreenshot(
  url: string,
  options?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
    fullPage?: boolean;
  }
): Promise<Buffer> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        gotoOptions: {
          waitUntil: options?.waitUntil || 'networkidle2',
          timeout: options?.timeout || 30000
        },
        screenshotOptions: {
          fullPage: options?.fullPage !== false,
          viewport: { width: 1920, height: 1080 },
          omitBackground: true
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Screenshot error: ${JSON.stringify(error)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
```

#### Error Handling & Retry Logic

```typescript
async function captureWithRetry(
  url: string,
  maxRetries = 3
): Promise<Buffer> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url,
            gotoOptions: { waitUntil: 'networkidle2', timeout: 30000 },
            screenshotOptions: {
              viewport: { width: 1280, height: 720 },
              omitBackground: true
            }
          })
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited, wait before retry
          const retryAfter = response.headers.get('retry-after') || '5';
          await new Promise(resolve =>
            setTimeout(resolve, parseInt(retryAfter) * 1000)
          );
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 2. YouTube oEmbed API

### Overview
YouTube provides an oEmbed endpoint for getting metadata about videos without authentication. Returns basic video information like title, author, thumbnail, and embed HTML.

### Official Documentation
- **oEmbed Spec**: https://oembed.com/
- **YouTube Implementation**: https://www.youtube.com/oembed (HTTPS only)

### Endpoint & Request Format

```
GET https://www.youtube.com/oembed
```

#### Query Parameters

```
?url={YOUTUBE_URL}&maxwidth={WIDTH}&maxheight={HEIGHT}&format=json
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | YouTube video URL (required, must be URL-encoded) |
| `maxwidth` | number | Maximum embed width (optional) |
| `maxheight` | number | Maximum embed height (optional) |
| `format` | string | Response format: `json` or `xml` (default: json) |

### Supported URL Formats

- Standard: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short: `https://youtu.be/VIDEO_ID`
- Embed: `https://www.youtube.com/embed/VIDEO_ID`
- Playlists: `https://www.youtube.com/playlist?list=PLAYLIST_ID`

### Response Format

```json
{
  "title": "Video Title",
  "author_name": "Channel Name",
  "author_url": "https://www.youtube.com/@channel",
  "type": "video",
  "height": 270,
  "width": 480,
  "version": "1.0",
  "provider_name": "YouTube",
  "provider_url": "https://www.youtube.com/",
  "thumbnail_height": 360,
  "thumbnail_width": 480,
  "thumbnail_url": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
  "html": "<iframe width=\"480\" height=\"270\" src=\"https://www.youtube.com/embed/VIDEO_ID\" frameborder=\"0\" allow=\"...\" allowfullscreen></iframe>"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Video title |
| `author_name` | string | Channel name |
| `author_url` | string | Channel URL |
| `type` | string | Always "video" for YouTube |
| `height` | number | Recommended embed height |
| `width` | number | Recommended embed width |
| `version` | string | oEmbed version (always "1.0") |
| `provider_name` | string | "YouTube" |
| `provider_url` | string | "https://www.youtube.com/" |
| `thumbnail_url` | string | Thumbnail image URL |
| `thumbnail_height` | number | Thumbnail height |
| `thumbnail_width` | number | Thumbnail width |
| `html` | string | iframe embed code |

### Error Handling

- No explicit error codes; returns 404 if URL not found or invalid
- Rate limits: Unofficial API, respect reasonable request frequency

### Code Examples

#### Basic oEmbed Fetch

```typescript
async function getYouTubeMetadata(youtubeUrl: string) {
  const url = new URL('https://www.youtube.com/oembed');
  url.searchParams.set('url', youtubeUrl);
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('YouTube video not found');
    }
    throw new Error(`oEmbed request failed: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const metadata = await getYouTubeMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
console.log(metadata.title);
console.log(metadata.thumbnail_url);
```

#### Extract Video ID and Get Metadata

```typescript
function extractYouTubeVideoId(urlOrId: string): string | null {
  // Direct video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }

  // youtube.com/watch?v=...
  const watchMatch = urlOrId.match(/v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/...
  const shortMatch = urlOrId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/...
  const embedMatch = urlOrId.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/shorts/...
  const shortsMatch = urlOrId.match(/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

async function getVideoMetadata(urlOrId: string) {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) throw new Error('Invalid YouTube URL or video ID');

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const url = new URL('https://www.youtube.com/oembed');
  url.searchParams.set('url', youtubeUrl);
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Failed to fetch video metadata');
  }

  return response.json();
}
```

#### With Caching

```typescript
interface CachedMetadata {
  data: Record<string, any>;
  timestamp: number;
}

const metadataCache = new Map<string, CachedMetadata>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getYouTubeMetadataWithCache(youtubeUrl: string) {
  const cacheKey = `yt:${youtubeUrl}`;
  const cached = metadataCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const url = new URL('https://www.youtube.com/oembed');
  url.searchParams.set('url', youtubeUrl);
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Failed to fetch metadata');
  }

  const data = await response.json();

  // Cache for 24 hours
  metadataCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
}
```

---

## 3. YouTube Transcript Libraries

### @danielxceron/youtube-transcript

**NPM**: https://www.npmjs.com/package/@danielxceron/youtube-transcript
**Features**: Dual extraction (HTML scraping + InnerTube API fallback), YouTube Shorts support, TypeScript types

### Installation

```bash
npm install @danielxceron/youtube-transcript
# or
yarn add @danielxceron/youtube-transcript
```

### TypeScript Types

```typescript
interface TranscriptEntry {
  text: string;      // Transcript text content
  duration: number;  // Duration in seconds
  offset: number;    // Start time in seconds
  lang?: string;     // Language code (e.g., 'en', 'es')
}

interface TranscriptConfig {
  lang?: string;     // Preferred language code
  continueOnError?: boolean; // Continue on error
}
```

### Error Classes

```typescript
// YoutubeTranscriptEmptyError: Video has no transcript
// YoutubeTranscriptDisabledError: Transcripts disabled
// YoutubeTranscriptTooManyRequestsError: Rate limited
```

### Usage Examples

#### Basic Fetch

```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

// Using video URL
const transcript = await YoutubeTranscript.fetchTranscript(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
);

// Using video ID
const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ');

// Output
console.log(transcript);
// [
//   { text: "Hello", offset: 0, duration: 2 },
//   { text: "World", offset: 2, duration: 1.5 }
// ]
```

#### With Language Selection

```typescript
// Fetch transcript in specific language
const spanishTranscript = await YoutubeTranscript.fetchTranscript(
  'dQw4w9WgXcQ',
  { lang: 'es' }
);

// Supported language codes: 'en', 'es', 'fr', 'de', 'ja', 'ko', etc.
```

#### Supported URL Formats

```typescript
// All these formats work:
const formats = [
  'https://www.youtube.com/watch?v=VIDEO_ID',  // Standard
  'https://youtu.be/VIDEO_ID',                  // Short URL
  'https://www.youtube.com/shorts/VIDEO_ID',   // Shorts
  'https://www.youtube.com/embed/VIDEO_ID',    // Embedded
  'VIDEO_ID'                                     // Direct ID
];

for (const url of formats) {
  const transcript = await YoutubeTranscript.fetchTranscript(url);
}
```

#### Error Handling

```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

async function getTranscript(videoId: string) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript;
  } catch (error: any) {
    if (error.message.includes('empty')) {
      console.error('Video has no transcript available');
      return null;
    } else if (error.message.includes('disabled')) {
      console.error('Transcripts disabled for this video');
      return null;
    } else if (error.message.includes('429') || error.message.includes('rate')) {
      console.error('Rate limited, please retry later');
      return null;
    } else {
      console.error('Failed to fetch transcript:', error.message);
      return null;
    }
  }
}
```

#### Convert to Different Formats

```typescript
async function getTranscriptAsText(videoId: string): Promise<string> {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  return transcript.map(entry => entry.text).join(' ');
}

async function getTranscriptAsSRT(videoId: string): Promise<string> {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);

  return transcript
    .map((entry, index) => {
      const startTime = formatTime(entry.offset);
      const endTime = formatTime(entry.offset + entry.duration);
      return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}`;
    })
    .join('\n\n');
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

async function getTranscriptAsJSON(videoId: string): Promise<string> {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  return JSON.stringify(transcript, null, 2);
}
```

#### With Caching

```typescript
const transcriptCache = new Map<string, TranscriptEntry[]>();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getTranscriptCached(videoId: string): Promise<TranscriptEntry[]> {
  const cacheKey = `yt-transcript:${videoId}`;

  // Check cache first
  if (transcriptCache.has(cacheKey)) {
    return transcriptCache.get(cacheKey)!;
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    transcriptCache.set(cacheKey, transcript);
    return transcript;
  } catch (error) {
    console.error('Failed to fetch transcript:', error);
    throw error;
  }
}
```

#### Batch Processing

```typescript
async function getMultipleTranscripts(
  videoIds: string[],
  concurrency = 3
): Promise<Map<string, TranscriptEntry[]>> {
  const results = new Map<string, TranscriptEntry[]>();

  for (let i = 0; i < videoIds.length; i += concurrency) {
    const batch = videoIds.slice(i, i + concurrency);

    const promises = batch.map(async (id) => {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(id);
        results.set(id, transcript);
      } catch (error) {
        console.error(`Failed to fetch transcript for ${id}:`, error);
        results.set(id, []);
      }
    });

    await Promise.all(promises);
  }

  return results;
}
```

---

## 4. Node.js Fetch API Patterns for Binary Data

### Handling Binary Responses

#### ArrayBuffer Approach (Modern)

```typescript
async function fetchBinaryData(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Usage with Cloudflare
const screenshot = await fetchBinaryData(
  'https://api.cloudflare.com/client/v4/accounts/ID/browser-rendering/screenshot'
);
```

#### Streaming Approach (Memory Efficient)

```typescript
async function fetchBinaryStreaming(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Combine chunks into single buffer
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(combined);
}
```

### POST Requests with JSON Body & Bearer Token

#### Standard Pattern

```typescript
interface FetchOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, any>;
  token?: string;
}

async function apiFetch<T>(url: string, options: FetchOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`API Error ${response.status}: ${error.message}`);
  }

  return response.json();
}

// Usage
const result = await apiFetch('https://api.example.com/endpoint', {
  method: 'POST',
  body: { key: 'value' },
  token: 'your-api-token'
});
```

#### With Retry & Timeout

```typescript
async function fetchWithRetry(
  url: string,
  options: {
    method: string;
    headers?: Record<string, string>;
    body?: Record<string, any>;
    token?: string;
    timeout?: number;
    maxRetries?: number;
  }
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  const timeout = options.timeout ?? 30000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (options.token) {
        headers['Authorization'] = `Bearer ${options.token}`;
      }

      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Retry on 429 (rate limit) or 5xx errors
      if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      if (attempt === maxRetries) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Complete Integration Example

```typescript
// Cloudflare screenshot with proper binary handling and error management
async function captureScreenshotFromCloudflare(
  url: string,
  apiToken: string,
  accountId: string
): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/screenshot`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          screenshotOptions: {
            viewport: { width: 1280, height: 720 },
            omitBackground: true
          },
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Screenshot failed (${response.status}): ${errorText}`);
    }

    // Handle binary response
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Screenshot request timeout');
    }
    throw error;
  }
}
```

---

## Summary Table: API Comparison

| API | Method | Auth | Rate Limit | Response | Use Case |
|-----|--------|------|-----------|----------|----------|
| **Cloudflare Screenshot** | POST + binary | Bearer token | 6-180 req/min | PNG image | Screenshot websites |
| **YouTube oEmbed** | GET | None | ~Unmetered* | JSON metadata | Get video info |
| **YouTube Transcript** | Scraping | None | ~Unmetered* | JSON array | Get video captions |

\* Respect reasonable request frequency to avoid blocking

---

## Environment Variables

```bash
# Cloudflare Browser Rendering
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Optional: Cache settings
SCREENSHOT_CACHE_TTL=3600000  # 1 hour in milliseconds
METADATA_CACHE_TTL=86400000   # 24 hours in milliseconds
```

---

## Best Practices

### 1. Cloudflare Screenshots
- Use `waitUntil: 'networkidle2'` for reliable full page load
- Set reasonable timeout (30000-60000ms)
- Use `omitBackground: true` for cleaner images
- Implement exponential backoff for retries
- Cache screenshots by URL hash to reduce API calls

### 2. YouTube oEmbed
- Cache metadata for 24 hours
- Validate YouTube URLs before requests
- Extract video IDs for consistency
- Handle 404 gracefully (private/deleted videos)

### 3. YouTube Transcripts
- Handle "no transcript" errors gracefully
- Cache transcripts for 7+ days
- Use batch processing with rate limiting
- Respect InnerTube API limitations on production servers
- Implement fallback language selection

### 4. Fetch API
- Always set Content-Type header for POST requests
- Use Bearer token pattern for authentication
- Implement timeout handling with AbortController
- Use streaming for large binary responses
- Implement retry logic with exponential backoff
