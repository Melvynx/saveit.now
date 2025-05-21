# SaveIt Now Chrome Extension

This Chrome extension allows users to quickly save bookmarks to their SaveIt Now account with a single click.

## Features

- Save the current page URL to SaveIt Now with a single click
- Authentication integration with SaveIt Now
- Visual feedback during the save process
- Login redirection for unauthenticated users

## Development

### Prerequisites

- Node.js v16 or higher
- pnpm (preferred) or npm

### Setup

1. Install dependencies:

   ```
   pnpm install
   ```

2. Start development mode:
   ```
   pnpm dev
   ```

### Building

Build the extension:

```
pnpm build
```

### Packaging

Create a distributable zip file:

```
pnpm package
```

This will create a zip file in the `package` directory ready for distribution or uploading to the Chrome Web Store.

## Icon Files

Replace the placeholder icons in the `public/images` directory with your own icons:

- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

## Loading in Chrome

1. Build the extension using `pnpm build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" with the toggle in the top right
4. Click "Load unpacked" and select the `dist` directory
