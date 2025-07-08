# Worker CLAUDE.md

Cloudflare Worker for SaveIt.now screenshot service.

## Commands

- `pnpm dev:worker` - Start development server
- `pnpm deploy:worker` - Deploy to production
- `wrangler tail` - View real-time logs

## Architecture

**Production URL**: `https://saveit-screenshot.misty-unit-17f1.workers.dev`

### Routes
- `/` (default) - Web page screenshots
- `/pdf` - PDF document screenshots  
- `/youtube` - YouTube metadata and transcripts

### Environment
```toml
browser = { binding = "MYBROWSER" }
[[kv_namespaces]]
binding = "SAVEIT_KV"
id = "6d76cf4b513d4bc29ee4457383d18491"
```

## API Endpoints

### Screenshot
```
GET /?url=https://example.com
```
Returns: JPEG image

### PDF
```
GET /pdf?url=https://example.com/doc.pdf
```
Returns: JPEG image (first page, no browser UI)

### YouTube
```
GET /youtube?url=https://youtube.com/watch?v=VIDEO_ID
```
Returns: JSON with metadata and transcript

## Implementation Details

### PDF Rendering
- Uses PDF.js from unpkg CDN
- Renders first page at 1.5x scale
- Centered with flexbox layout
- No browser PDF viewer UI

### Screenshot Config
- Viewport: 1280x720px
- JPEG quality: 80%
- Timeout: 15 seconds

### Dependencies
- `@cloudflare/puppeteer` - Browser automation
- `@danielxceron/youtube-transcript` - YouTube transcripts
- `playwright-core` - Browser core

## Error Handling
- 400: Missing/invalid URL
- 500: Processing failed

## Testing
```bash
pnpm dev:worker
# Test: http://localhost:8787/?url=https://example.com
```

## Common Issues
- PDF: Ensure PDF.js CDN accessible
- YouTube: Check transcript availability
- Screenshots: Verify page accessibility

## Workflow
- Test locally before deployment
- Use `wrangler tail` for debugging
- Deploy only after successful testing