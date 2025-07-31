# SaveIt.now Mobile App - Expo Integration Plan

## Executive Summary

This document outlines the comprehensive plan for integrating an Expo React Native mobile application into the existing SaveIt.now Turborepo monorepo. The mobile app will provide native bookmark management capabilities with focus on native sharing functionality, authentication integration, and code reuse from the existing web application.

## Current Architecture Analysis

The existing monorepo structure:
```
├── apps/
│   ├── web/              # Next.js 15 web app with Better Auth
│   ├── chrome-extension/ # Chrome browser extension  
│   ├── firefox-extension/# Firefox browser extension
│   └── worker/           # Cloudflare Worker
├── packages/
│   ├── database/         # Prisma database client
│   ├── ui/               # Shared UI components (shadcn/ui)
│   ├── eslint-config/    # Shared ESLint config
│   └── typescript-config/# Shared TypeScript config
```

**Technology Stack:**
- Package Manager: pnpm with Turborepo
- Authentication: Better Auth with GitHub/Google OAuth, magic links, email OTP
- Database: PostgreSQL with Prisma ORM
- Background Jobs: Inngest
- File Storage: AWS S3
- Payments: Stripe integration

## 1. Expo Integration Strategy

### 1.1 Repository Structure (Recommended)

Add the mobile app to the existing monorepo:

```
├── apps/
│   ├── mobile/           # NEW: Expo React Native app (self-contained)
│   ├── web/              # Existing Next.js app
│   ├── chrome-extension/ # Existing
│   ├── firefox-extension/# Existing  
│   └── worker/           # Existing
├── packages/
│   ├── database/         # Existing - shared Prisma client only
│   ├── ui/               # Existing - web-specific UI components
│   ├── eslint-config/    # Existing
│   └── typescript-config/# Existing
```

### 1.2 Simplified Architecture Philosophy

**Key Decisions:**
- **Self-Contained Mobile App**: Everything mobile-specific stays in `apps/mobile`
- **Minimal Dependencies**: Only share the database package (Prisma client)
- **Native UI Approach**: Use platform-specific patterns for truly native feel
- **Zero Lag Philosophy**: Prioritize 60fps animations and native performance

### 1.3 Expo Configuration Best Practices (2025)

**Key Recommendations:**
- **Expo SDK**: Version 52+ (automatic monorepo detection)
- **Package Manager**: Continue using pnpm (supported since SDK 52)
- **Metro Config**: Automatic configuration for monorepos in Expo 52+
- **Development Strategy**: Use custom development builds (expo-dev-client)
- **UI Strategy**: Pure React Native components with platform-specific styling

## 2. Step-by-Step Implementation Plan

### Phase 1: Foundation Setup

#### Step 1: Create Expo App Structure
```bash
# From repo root
cd apps
npx create-expo-app mobile --template tabs
cd mobile
pnpm install expo-dev-client expo-router expo-constants expo-linking
```

#### Step 2: Configure Metro for Monorepo
```javascript
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Enable monorepo support
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
```

#### Step 3: Update Turborepo Configuration
```json
// turbo.json - Add mobile-specific tasks
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "dependsOn": ["^build"]
    },
    "build:mobile": {
      "outputs": [],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "dev:mobile": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "clean": {
      "cache": false
    }
  }
}
```

#### Step 4: Configure Development Build
```json
// apps/mobile/eas.json
{
  "cli": {
    "version": ">= 6.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### Phase 2: Shared Package Architecture

#### Step 2.1: Mobile App Internal Structure

**apps/mobile/src/ structure:**
```
apps/mobile/src/
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── bookmark/              # Bookmark-specific components
│   └── auth/                  # Authentication components
├── lib/
│   ├── api/
│   │   ├── client.ts          # API client configuration
│   │   ├── bookmarks.ts       # Bookmark API methods
│   │   └── auth.ts            # Auth API methods
│   ├── types/
│   │   ├── bookmark.types.ts  # Bookmark interfaces
│   │   ├── user.types.ts      # User/auth types
│   │   └── api.types.ts       # API response types
│   ├── utils/
│   │   ├── url-cleaner.ts     # URL processing utilities
│   │   ├── validation.ts      # Validation logic
│   │   └── constants.ts       # App constants
│   ├── hooks/
│   │   ├── useBookmarks.ts    # Bookmark management logic
│   │   ├── useAuth.ts         # Authentication logic
│   │   └── useTags.ts         # Tag management
│   └── styles/
│       ├── ios.ts             # iOS-specific styles
│       ├── android.ts         # Android-specific styles
│       └── common.ts          # Shared styles
└── contexts/
    ├── AuthContext.tsx        # Authentication context
    └── BookmarkContext.tsx    # Bookmark management context
```

### Phase 3: Authentication Integration

#### Step 3.1: Better Auth Mobile Configuration

**Install Dependencies:**
```bash
cd apps/mobile
pnpm install better-auth @better-auth/expo expo-secure-store expo-auth-session expo-crypto
```

**Auth Configuration:**
```typescript
// apps/mobile/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_AUTH_URL, // Your auth backend URL
  plugins: [
    expoClient({
      scheme: "saveit", // Match app.json scheme
      storagePrefix: "saveit",
      storage: SecureStore,
    })
  ]
});
```

**App Configuration:**
```json
// apps/mobile/app.json
{
  "expo": {
    "name": "SaveIt",
    "slug": "saveit-mobile",
    "scheme": "saveit",
    "plugins": [
      "expo-router",
      [
        "expo-auth-session",
        {
          "scheme": "saveit"
        }
      ]
    ]
  }
}
```

#### Step 3.2: Authentication Context
```typescript
// apps/mobile/src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import type { User } from '@saveit/shared';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    authClient.getSession().then((session) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await authClient.signIn.email({
      email,
      password,
    });
    
    if (result.data?.user) {
      setUser(result.data.user);
    }
  };

  const signOut = async () => {
    await authClient.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Phase 4: Mobile App Structure with Expo Router

#### Step 4.1: Route Organization
```
apps/mobile/app/
├── _layout.tsx                 # Root layout with auth provider
├── (auth)/                     # Auth group - not authenticated
│   ├── _layout.tsx            # Auth layout
│   ├── index.tsx              # Sign in page
│   └── register.tsx           # Registration page
├── (main)/                     # Main app - authenticated users
│   ├── _layout.tsx            # Main layout with tabs
│   ├── (tabs)/                # Tab navigator
│   │   ├── _layout.tsx        # Tab layout
│   │   ├── index.tsx          # Bookmarks list
│   │   ├── search.tsx         # Search page
│   │   └── profile.tsx        # Profile/settings
│   └── bookmark/
│       └── [id].tsx           # Individual bookmark view
└── share-handler.tsx          # Handle shared content
```

#### Step 4.2: Root Layout with Authentication
```typescript
// apps/mobile/app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';

function RootLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(main)" />
      <Stack.Screen name="share-handler" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}
```

### Phase 5: Core Mobile Views

#### Step 5.1: Sign In Page
```typescript
// apps/mobile/app/(auth)/index.tsx
import { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(main)');
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SaveIt</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Pressable 
        style={styles.button}
        onPress={handleSignIn}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
```

#### Step 5.2: Bookmarks List Page
```typescript
// apps/mobile/app/(main)/(tabs)/index.tsx
import { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useBookmarks } from '@saveit/shared';
import type { Bookmark } from '@saveit/shared';

interface BookmarkItemProps {
  bookmark: Bookmark;
  onPress: () => void;
}

function BookmarkItem({ bookmark, onPress }: BookmarkItemProps) {
  return (
    <Pressable style={styles.bookmarkItem} onPress={onPress}>
      <Text style={styles.bookmarkTitle} numberOfLines={2}>
        {bookmark.title || bookmark.url}
      </Text>
      <Text style={styles.bookmarkUrl} numberOfLines={1}>
        {bookmark.url}
      </Text>
      <Text style={styles.bookmarkDate}>
        {new Date(bookmark.createdAt).toLocaleDateString()}
      </Text>
    </Pressable>
  );
}

export default function BookmarksPage() {
  const router = useRouter();
  const { bookmarks, isLoading, fetchBookmarks } = useBookmarks();

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const handleBookmarkPress = (bookmark: Bookmark) => {
    router.push(`/bookmark/${bookmark.id}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Text>Loading bookmarks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookmarkItem
            bookmark={item}
            onPress={() => handleBookmarkPress(item)}
          />
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  bookmarkItem: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookmarkUrl: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bookmarkDate: {
    fontSize: 12,
    color: '#999',
  },
});
```

## 6. Native Sharing Implementation

### 6.1 Share Extension Strategy

The most robust solution is **expo-share-intent** package, which provides:
- Cross-platform sharing (iOS & Android)
- Support for URLs, text, images, videos, and files
- Native integration with system share menus
- Single codebase for both platforms

### 6.2 Installation and Configuration

**Install Dependencies:**
```bash
cd apps/mobile
npx expo install expo-share-intent
```

**Configure in app.json:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-share-intent",
        {
          "iosActivationRules": {
            "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
            "NSExtensionActivationSupportsWebPageWithMaxCount": 1,
            "NSExtensionActivationSupportsImageWithMaxCount": 5,
            "NSExtensionActivationSupportsMovieWithMaxCount": 1,
            "NSExtensionActivationSupportsText": true
          },
          "androidIntentFilters": ["text/*", "image/*", "video/*"]
        }
      ]
    ]
  }
}
```

### 6.3 Share Handler Implementation

```typescript
// apps/mobile/app/share-handler.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import { router } from 'expo-router';
import { createBookmark } from '@saveit/shared';

export default function ShareHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      handleSharedContent();
    }
  }, [hasShareIntent, shareIntent]);

  const handleSharedContent = async () => {
    if (!shareIntent) return;

    setIsCreating(true);
    try {
      let bookmarkData: any = {};

      // Handle different types of shared content
      if (shareIntent.webUrl || shareIntent.text) {
        // URL or text content
        bookmarkData = {
          url: shareIntent.webUrl || shareIntent.text,
          title: shareIntent.subject || undefined,
        };
      } else if (shareIntent.files && shareIntent.files.length > 0) {
        // File content (images, etc.)
        const file = shareIntent.files[0];
        bookmarkData = {
          type: 'image',
          fileUri: file.path,
          title: shareIntent.subject || `Shared ${file.extension?.toUpperCase() || 'file'}`,
        };
      }

      await createBookmark(bookmarkData);
      setIsSuccess(true);
      
      // Show success for 2 seconds, then close
      setTimeout(() => {
        resetShareIntent();
        router.dismiss();
      }, 2000);
      
    } catch (error) {
      console.error('Error creating bookmark:', error);
      Alert.alert('Error', 'Failed to save bookmark. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    resetShareIntent();
    router.dismiss();
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <Pressable style={styles.button} onPress={handleCancel}>
          <Text style={styles.buttonText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successText}>Bookmark saved successfully!</Text>
      </View>
    );
  }

  if (isCreating) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Saving bookmark...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Save to SaveIt</Text>
      
      {shareIntent?.webUrl && (
        <Text style={styles.contentText}>URL: {shareIntent.webUrl}</Text>
      )}
      
      {shareIntent?.text && !shareIntent?.webUrl && (
        <Text style={styles.contentText}>Text: {shareIntent.text}</Text>
      )}
      
      {shareIntent?.files && shareIntent.files.length > 0 && (
        <Text style={styles.contentText}>
          File: {shareIntent.files[0].fileName}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        <Pressable style={[styles.button, styles.saveButton]} onPress={handleSharedContent}>
          <Text style={styles.buttonText}>Save Bookmark</Text>
        </Pressable>
        
        <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
});
```

## 7. Development Workflow

### 7.1 Development Build Setup

Since expo-share-intent requires native code, you cannot use Expo Go. You must use a custom development build:

```bash
# Create development build
cd apps/mobile
eas build --profile development --platform ios
eas build --profile development --platform android

# Install on device/simulator
eas build:install --profile development
```

### 7.2 Local Development Commands

**Add to root package.json:**
```json
{
  "scripts": {
    "dev:mobile": "cd apps/mobile && expo start --dev-client",
    "build:mobile": "cd apps/mobile && eas build",
    "build:mobile:dev": "cd apps/mobile && eas build --profile development"
  }
}
```

**Add to mobile app package.json:**
```json
{
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build": "eas build",
    "build:dev": "eas build --profile development"
  }
}
```

## 8. Technical Considerations

### 8.1 Performance Optimizations

1. **Metro Caching**: Use Turborepo cache for Metro builds
2. **Bundle Optimization**: Configure code splitting for shared packages
3. **Lazy Loading**: Implement lazy loading for bookmark content
4. **Image Optimization**: Use Expo Image component for bookmark thumbnails

### 8.2 Offline Support

1. **Data Caching**: Implement SQLite for offline bookmark storage
2. **Sync Strategy**: Queue bookmark creation for later sync
3. **Conflict Resolution**: Handle offline/online data conflicts

### 8.3 Testing Strategy

1. **Unit Tests**: Test shared business logic
2. **Integration Tests**: Test authentication flows
3. **E2E Tests**: Test share functionality with Detox
4. **Device Testing**: Test sharing on multiple devices/OS versions

## 9. Deployment Strategy

### 9.1 Development Phase
- Use EAS development builds for testing
- Test sharing functionality thoroughly
- Validate authentication flows

### 9.2 Beta Testing
- Use EAS internal distribution
- TestFlight for iOS beta testing
- Google Play Internal Testing for Android

### 9.3 Production
- App Store and Google Play Store submissions
- Implement code-push for JavaScript updates
- Monitor crash reporting and analytics

## 10. Security Considerations

### 10.1 Data Protection
- Use expo-secure-store for sensitive data
- Validate all shared content before processing
- Implement proper URL sanitization

### 10.2 Authentication Security
- Use secure storage for tokens
- Implement proper session management
- Handle token refresh automatically

## 11. Maintenance and Updates

### 11.1 Dependency Management
- Keep Expo SDK updated
- Monitor for security updates
- Test thoroughly before updates

### 11.2 Code Sharing
- Maintain clear boundaries between platforms
- Regular refactoring of shared packages
- Document platform-specific implementations

## 12. Timeline Estimate

**Phase 1: Foundation (1-2 weeks)**
- Set up Expo app in monorepo
- Configure basic routing and authentication

**Phase 2: Core Features (2-3 weeks)**
- Implement bookmark list and detail views
- Set up shared packages and business logic

**Phase 3: Sharing Implementation (1-2 weeks)**
- Implement expo-share-intent
- Test sharing functionality across platforms

**Phase 4: Polish & Testing (1-2 weeks)**
- UI/UX improvements
- Comprehensive testing
- Performance optimization

**Total Estimated Time: 5-9 weeks**

## 13. Resources and Documentation

- [Expo Monorepo Documentation](https://docs.expo.dev/guides/monorepos/)
- [Better Auth Expo Integration](https://www.better-auth.com/docs/integrations/expo)
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent)
- [Expo Router Authentication](https://docs.expo.dev/router/advanced/authentication/)
- [EAS Build Monorepo Setup](https://docs.expo.dev/build-reference/build-with-monorepos/)

This comprehensive plan provides a solid foundation for implementing a native mobile app within your existing SaveIt.now monorepo, with focus on maintainable code, excellent user experience, and robust sharing functionality.