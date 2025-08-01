# Tools System

This directory contains shared utilities and types for the SaveIt.now tools system.

## Files

### `tool-utils.ts`
Contains utility functions that can be reused across different tools:

- **File Operations**: `downloadFile()`, `downloadJSON()`, `downloadText()`
- **Clipboard**: `copyToClipboard()`
- **URL Handling**: `validateURL()`, `resolveURL()`, `extractDomain()`, `generateFilenameFromURL()`
- **Formatting**: `formatFileSize()`, `sanitizeFilename()`
- **Utilities**: `isBrowser()`, `debounce()`

### `tool-types.ts`
Contains TypeScript interfaces and types for consistent tool development:

- **Base Types**: `BaseToolRequest`, `BaseToolResponse`, `ToolError`
- **Response Types**: `ToolSuccessResponse`, `ToolErrorResponse`, `RateLimitResponse`
- **Metadata Types**: `ImageMetadata`, `SocialMetadata`, `WebsiteAnalysis`
- **Validation**: `ValidationResult`, `URLAnalysisResult`
- **Performance**: `ToolPerformance`, `ToolAnalytics`

### `index.ts`
Barrel export file for clean imports.

## Usage Examples

```typescript
// Import utilities
import { downloadFile, copyToClipboard, validateURL } from "@/lib/tools";

// Download a file
await downloadFile("https://example.com/image.jpg", "my-image.jpg");

// Copy to clipboard
await copyToClipboard("Hello world!");

// Validate URL
const isValid = validateURL("https://example.com");

// Import types
import type { ToolResponse, ImageMetadata } from "@/lib/tools";

const response: ToolResponse<ImageMetadata> = {
  success: true,
  data: {
    url: "https://example.com/image.jpg",
    width: 1200,
    height: 630
  },
  timestamp: new Date().toISOString()
};
```

## Design Principles

1. **Reusability**: All utilities should be generic enough to work across different tools
2. **Type Safety**: Comprehensive TypeScript types for better developer experience
3. **Error Handling**: Proper error handling with meaningful error messages
4. **Browser Compatibility**: Functions work reliably across modern browsers
5. **Performance**: Efficient implementations suitable for production use

## Adding New Tools

When creating new tools:

1. Use the shared types from `tool-types.ts`
2. Leverage existing utilities from `tool-utils.ts`
3. Follow the established patterns for error handling and response formatting
4. Add new reusable utilities to this directory if they can benefit other tools