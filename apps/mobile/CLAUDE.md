# CLAUDE.md - Mobile App

This file provides guidance for working with the SaveIt.now mobile application built with React Native and Tamagui.

## Initial Setup Commands

### Prerequisites Installation
```bash
# Install Node.js dependencies
pnpm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..

# Install React Native CLI globally (if needed)
npm install -g @react-native-community/cli
```

### Tamagui Setup
```bash
# Core Tamagui installation (already included in package.json)
pnpm add @tamagui/core @tamagui/config tamagui

# Development dependencies for Tamagui
pnpm add -D @tamagui/babel-plugin
```

### Platform Setup
```bash
# iOS setup (macOS only)
npx react-native run-ios

# Android setup
npx react-native run-android

# Metro bundler (development server)
npx react-native start
```

## Development Commands

### Core Commands
- `pnpm start` - Start Metro bundler
- `pnpm ios` - Run on iOS simulator
- `pnpm android` - Run on Android emulator
- `pnpm build:ios` - Build iOS app
- `pnpm build:android` - Build Android app

### Development Tools
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Run TypeScript checks

## Tamagui Overview

### What is Tamagui?
Tamagui is a universal component system and styling library that works across React Native and web platforms, providing:

- **Universal Styling**: Write once, runs on web and native
- **Performance**: Compile-time optimizations and runtime efficiency
- **Type Safety**: Full TypeScript support with autocomplete
- **Theme System**: Built-in light/dark mode and custom themes
- **Responsive Design**: Media queries and breakpoints
- **Animation**: Built-in animations and transitions

### Key Features
- **Cross-platform**: Shared components between web and mobile
- **Compile-time**: Styles extracted at build time for better performance
- **Token System**: Consistent design tokens for spacing, colors, typography
- **Media Queries**: Responsive breakpoints that work on native
- **Variants**: Conditional styling based on props
- **Themes**: Easy theme switching and customization

### Configuration
Tamagui is configured in `tamagui.config.ts` with:
- **Tokens**: Design system values (sizes, colors, fonts)
- **Themes**: Light/dark mode definitions
- **Media Queries**: Responsive breakpoints
- **Fonts**: Typography settings
- **Components**: Custom component configurations

### Basic Usage
```tsx
import { View, Text, Button } from 'tamagui'

export function MyComponent() {
  return (
    <View backgroundColor="$background" padding="$4">
      <Text fontSize="$6" color="$color">
        Hello Tamagui!
      </Text>
      <Button theme="active" size="$4">
        Press me
      </Button>
    </View>
  )
}
```

### Styling Capabilities
- **Inline Props**: Direct styling via component props
- **Responsive**: Different styles per breakpoint
- **Variants**: Conditional styling patterns
- **Animations**: Built-in spring and timing animations
- **Themes**: Dynamic theme switching
- **Custom Components**: Create reusable styled components

## Architecture

### File Structure
```
apps/mobile/
├── src/
│   ├── components/     # Shared UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation setup
│   ├── lib/           # Utilities and configurations
│   ├── hooks/         # Custom React hooks
│   └── types/         # TypeScript type definitions
├── ios/               # iOS native code
├── android/           # Android native code
└── tamagui.config.ts  # Tamagui configuration
```

### Key Dependencies
- **React Native**: Mobile framework
- **Tamagui**: UI library and styling system
- **React Navigation**: Navigation library
- **Better Auth**: Authentication (shared with web)
- **Expo**: Development tools and native APIs

## Environment Setup

### Required Environment Variables
Copy `.env.example` to `.env` and configure:
- API endpoints
- Authentication keys
- Third-party service tokens

### Platform Requirements
- **iOS**: Xcode 12+ (macOS only)
- **Android**: Android Studio and Android SDK
- **Node.js**: 18+ 
- **pnpm**: Package manager

## Troubleshooting

### Common Issues
- **Metro cache**: Clear with `npx react-native start --reset-cache`
- **iOS pods**: Delete `ios/Pods` and run `pod install`
- **Android**: Clean with `cd android && ./gradlew clean`
- **Tamagui**: Ensure babel plugin is configured correctly

### Debugging
- **Flipper**: React Native debugging tool
- **React DevTools**: Component inspection
- **Network**: Monitor API calls
- **Logs**: Use `npx react-native log-ios` or `npx react-native log-android`

## Development Memories

### Tamagui Component Guidelines
- Always use `gap` and not `space` with tamgui component