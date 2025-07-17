# Chrome Extension Build System

This Chrome extension supports different build configurations for development and production environments.

## Build Commands

### Development Build (localhost)
```bash
pnpm build:dev
```
- Uses `http://localhost:3000` as base URL
- No minification for better debugging
- Suitable for local development testing

### Production Build (production)
```bash
pnpm build:prod
```
- Uses `https://saveit.now` as base URL  
- Minified code for production
- Default build command

### Legacy Commands
```bash
pnpm build        # Same as build:prod
pnpm package:dev  # Build dev + package
pnpm package      # Build prod + package
```

## Environment Configuration

The build system automatically injects the correct configuration based on the build type:

- **Development**: `http://localhost:3000`
- **Production**: `https://saveit.now`

## Usage

1. **For local testing**: Use `pnpm build:dev` to build extension that connects to your local dev server
2. **For production**: Use `pnpm build:prod` to build extension for the live website

The extension will automatically use the correct API endpoints based on how it was built.