# SaveIt.now Firefox Extension

A Firefox WebExtension that allows you to save bookmarks to SaveIt.now directly from your browser.

## Features

- **One-click saving**: Save the current page with a single click on the extension icon
- **Context menu integration**: Right-click on any page or image to save it
- **Visual feedback**: Elegant popup notifications showing save status
- **Authentication integration**: Seamless login integration with SaveIt.now
- **Error handling**: Clear error messages for various scenarios (auth required, bookmark exists, etc.)

## Installation

### For Users

1. **Firefox Add-ons Store** (coming soon)
   - Install directly from the Mozilla Add-ons store

2. **Manual Installation (.xpi file)**
   - Download the latest `.xpi` file from releases
   - Open Firefox and go to `about:addons`
   - Click the gear icon and select "Install Add-on From File..."
   - Navigate to and select the downloaded `.xpi` file
   - Click "Add" to confirm the installation

### For Developers

1. **Temporary Installation (Development)**
   ```bash
   # Build the extension first
   pnpm install
   pnpm run build
   ```
   
   - Open Firefox and go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Navigate to the `dist` folder in this directory
   - Select the `manifest.json` file
   - The extension will be loaded temporarily (until Firefox restarts)

2. **Permanent Development Installation**
   ```bash
   # Create a packaged .xpi file
   pnpm run package
   ```
   
   - Follow the manual installation steps above using the generated `.xpi` file

## Development

### Prerequisites

- Node.js 16+ and pnpm
- Firefox Browser
- TypeScript knowledge

### Setup

```bash
# Install dependencies
pnpm install

# Development build (watch mode)
pnpm run dev

# Production build
pnpm run build

# Create packaged extension
pnpm run package

# Clean build files
pnpm run clean
```

### Project Structure

```
firefox-extension/
├── src/
│   ├── auth-client.ts      # Authentication with SaveIt.now
│   ├── background.ts       # Background script (service worker)
│   └── content.ts          # Content script for UI injection
├── public/
│   ├── manifest.json       # Firefox WebExtension manifest
│   ├── content.css         # Styles for injected UI
│   └── images/             # Extension icons
├── scripts/
│   ├── copy-assets.js      # Build script
│   └── package-extension.js # Packaging script
└── dist/                   # Built extension files
```

### Key Differences from Chrome Extension

This Firefox extension includes several adaptations for Firefox compatibility:

1. **Manifest V2**: Uses Manifest V2 format for better Firefox compatibility
2. **Background Scripts**: Uses persistent background scripts instead of service workers
3. **WebExtension Polyfill**: Includes polyfill for cross-browser API compatibility
4. **Browser Action**: Uses `browser_action` instead of `action` for Firefox
5. **Permissions Format**: Adjusted permission declarations for Firefox
6. **Firefox-specific ID**: Includes `applications.gecko` section with extension ID

### API Compatibility

The extension uses the `webextension-polyfill` library to ensure compatibility across different browsers. The code automatically falls back to Chrome APIs when running in Chrome-based browsers.

```typescript
// Automatic API selection
const api = typeof browser !== "undefined" ? browser : chrome;
```

### Build Process

The build process includes:

1. **TypeScript Compilation**: Compiles `.ts` files to JavaScript with esbuild
2. **Asset Copying**: Copies manifest, CSS, and images to dist folder
3. **Polyfill Integration**: Adds WebExtension polyfill for Firefox compatibility
4. **Minification**: Minifies the code for production builds

### Testing

1. **Load in Firefox**: Use the temporary add-on loading feature
2. **Test Authentication**: Ensure login flow works with SaveIt.now
3. **Test Saving**: Verify bookmark saving functionality
4. **Test Context Menus**: Check right-click context menu options
5. **Test Error Handling**: Verify error states (auth required, duplicates, etc.)

### Debugging

1. **Extension Console**: 
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Inspect" next to your extension
   - Use the console for background script debugging

2. **Content Script Debugging**:
   - Open browser developer tools on any page
   - Content script logs appear in the page console

3. **Common Issues**:
   - **CORS errors**: Ensure SaveIt.now server allows extension domain
   - **Authentication issues**: Check cookie settings and permissions
   - **Content script not injecting**: Verify permissions in manifest

### Firefox-specific Features

- **Gecko Application ID**: Properly identified in Firefox ecosystem
- **Firefox Add-ons compatibility**: Follows Firefox extension guidelines
- **Security Model**: Adheres to Firefox's security requirements
- **Update mechanism**: Compatible with Firefox's update system

## API Integration

The extension integrates with SaveIt.now through:

- **Authentication**: Uses better-auth client for session management
- **Bookmark API**: Saves bookmarks via REST API calls
- **CORS handling**: Properly configured for cross-origin requests

## Permissions

The extension requires these permissions:

- `activeTab`: Access current tab for saving pages
- `storage`: Store user preferences and cache
- `cookies`: Access authentication cookies
- `contextMenus`: Add right-click context menu options
- `https://saveit.now/*`: Access to SaveIt.now API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly in Firefox
5. Submit a pull request

## License

This project is licensed under the same terms as the main SaveIt.now project.

## Support

For issues specific to the Firefox extension:
1. Check the console for error messages
2. Verify Firefox version compatibility (requires Firefox 57+)
3. Report issues with detailed steps to reproduce

For general SaveIt.now issues, visit the main project repository.