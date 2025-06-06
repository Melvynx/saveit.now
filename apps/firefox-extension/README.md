# SaveIt Now Firefox Extension

This Firefox extension allows users to quickly save bookmarks to their SaveIt Now account with a single click.

## Features

- Save the current page URL to SaveIt Now with a single click
- Authentication integration with SaveIt Now
- Visual feedback during the save process
- Login redirection for unauthenticated users
- Context menu integration for saving pages and images
- Cross-browser compatibility with WebExtension APIs

## Development

### Prerequisites

- Node.js v16 or higher
- pnpm (preferred) or npm
- Firefox Developer Edition (recommended for testing)

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start development mode:
   ```bash
   pnpm dev
   ```

### Building

Build the extension:

```bash
pnpm build
```

### Packaging

Create a distributable .xpi file:

```bash
pnpm package
```

This will create an .xpi file in the `package` directory ready for distribution or uploading to Firefox Add-ons (AMO).

## Icon Files

The extension uses the same icons as the Chrome extension:

- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)
- `icon256.png` (256x256px)

## Loading in Firefox

### Temporary Installation (Development)

1. Build the extension using `pnpm build`
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on..."
5. Select the `manifest.json` file from the `dist` directory

### Permanent Installation

For permanent installation, the extension needs to be:
1. Packaged as an .xpi file using `pnpm package`
2. Submitted to [Firefox Add-ons (AMO)](https://addons.mozilla.org/developers/) for review
3. Or signed using [web-ext sign](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign) for self-distribution

## Firefox-Specific Features

### Manifest v2

This extension uses Manifest v2 for maximum compatibility with Firefox versions. Key differences from the Chrome extension:

- Uses `browser_action` instead of `action`
- Uses `background.scripts` with `persistent: true` instead of service workers
- Different permission format
- Includes `applications.gecko` configuration for Firefox-specific metadata

### WebExtension APIs

The extension uses the standard WebExtension APIs that work across Firefox and Chrome:

- `browser.*` APIs with Chrome compatibility fallback
- Context menus for right-click functionality
- Background scripts for persistent functionality
- Content scripts for page interaction

### Browser Compatibility

- **Firefox**: 57.0+ (with WebExtensions support)
- **Firefox ESR**: 60.0+
- **Firefox Mobile**: 68.0+ (Android)

## Development Tips

### Testing

1. Use Firefox Developer Edition for development
2. Enable extension debugging in `about:debugging`
3. Use the Browser Console (Ctrl+Shift+J) to view background script logs
4. Use regular DevTools to debug content scripts

### Hot Reloading

The `pnpm dev` command watches for changes and rebuilds automatically. However, you'll need to:

1. Reload the extension in `about:debugging`
2. Refresh any pages where you want to test content script changes

### Web-ext Tool

For advanced development, consider using Mozilla's `web-ext` tool:

```bash
npm install -g web-ext
cd dist
web-ext run
```

This provides automatic reloading and other development features.

## Differences from Chrome Extension

- Uses Manifest v2 for better Firefox compatibility
- Uses `browser.*` APIs with Chrome fallback
- Uses persistent background pages instead of service workers
- Slightly different permission and configuration format
- Generates .xpi files instead of .zip files for distribution

## Troubleshooting

### Extension Not Loading

- Ensure all required permissions are granted
- Check the Browser Console for error messages
- Verify the manifest.json syntax is valid

### Authentication Issues

- Ensure cookies are enabled for saveit.now
- Check that the extension has permission to access saveit.now
- Verify network connectivity and CORS settings

### Content Script Not Working

- Check that the page allows content script injection
- Verify the content script is properly compiled and included
- Use the page's DevTools to debug content script issues