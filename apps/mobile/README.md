# SaveIt Mobile App

React Native mobile app built with Expo and Tamagui.

## Environment Setup

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Available Environment Files

- `.env` - Default environment variables
- `.env.development` - Development environment (localhost)
- `.env.production` - Production environment (replace with your domain)

### Required Variables

- `EXPO_PUBLIC_API_URL` - Your SaveIt backend API URL
  - Development: `http://localhost:3000`
  - Production: `https://your-production-domain.com`

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android  
pnpm android
```

## Production Build

```bash
# EAS Cloud Build (recommended)
eas build --platform ios --profile production

# Local build
npx expo export --platform ios
npx expo prebuild --platform ios --clean
```

## Share Extension

The app includes an iOS Share Extension that allows users to save bookmarks directly from Safari and other apps. The extension automatically processes shared URLs and saves them to the user's SaveIt collection.

### Testing Share Extension

1. Build and install the app on a physical iOS device
2. Open Safari and navigate to any website
3. Tap the Share button
4. Look for "SaveIt" in the share sheet
5. Tap to save the bookmark automatically

## Architecture

- **Expo Router** - File-based routing
- **Tamagui** - Universal UI system
- **TanStack Query** - Server state management
- **Better Auth** - Authentication
- **expo-share-intent** - iOS/Android share extension functionality