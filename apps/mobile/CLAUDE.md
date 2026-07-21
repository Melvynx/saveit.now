# CLAUDE.md - Mobile App

This file provides guidance for working with the SaveIt.now mobile application built with React Native (Expo) and NativeWind.

## Initial Setup Commands

```bash
# Install Node.js dependencies
pnpm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..
```

## Development Commands

- `pnpm start` - Start Metro bundler (dev client)
- `pnpm ios` - Run on iOS simulator
- `pnpm android` - Run on Android emulator
- `pnpm lint` - Run ESLint
- `npx tsc --noEmit` - Run TypeScript checks

## Styling: NativeWind + Design System

The app uses **NativeWind v4** (Tailwind CSS for React Native) with a shadcn-style design system modeled after nowstack-mobile.

### Key Files

- `tailwind.config.js` - Semantic color tokens + DM Sans font families
- `global.css` - CSS variables for light + dark themes (media-query based)
- `babel.config.js` - `babel-preset-expo` with `jsxImportSource: "nativewind"` + `nativewind/babel`
- `metro.config.js` - wrapped with `withNativeWind({ input: './global.css' })`
- `src/lib/utils.ts` - `cn()` helper (clsx + tailwind-merge)
- `src/lib/cva.ts` - Minimal CVA helper for variant-driven components
- `src/lib/theme.ts` - Raw color constants + `useThemeColors()` hook (for tab bar, icons, ActivityIndicator)

### UI Kit (`src/components/ui/`)

`Button` (big rounded-full CTA, `min-h-[52px]`), `Text` (variants: title, subtitle, section-label, body, caption, label, cta-label), `Card`, `Input`, `ListItem`, `Screen`, `Header`, `LoadingScreen`/`LoadingSpinner`.

### Dusk surfaces (marketing/auth)

Onboarding (`src/screens/OnboardingScreen.tsx`), sign-in, welcome, paywall, and goodbye use the fixed-dark **"dusk"** theme mirroring the web landing v2 (always dark, independent of the color scheme — same split as the web app, where marketing + auth are dusk and the signed-in app is not):

- Tokens: `bg-dusk`, `bg-dusk-card`, `bg-dusk-raised`, `text-dusk-fg`, `text-dusk-muted`, `text-dusk-cream`, `text-dusk-peach`, `bg-dusk-primary`, `text-dusk-primary-fg`, `text-dusk-destructive` (tailwind.config.js); raw values in `duskColors` (`src/lib/theme.ts`) for icon/spinner props. Borders: `border-white/10`.
- Display type: Instrument Serif via `font-serif` / `font-serif-italic`; accent words are italic serif in `text-dusk-primary` (never gradient text).
- Primitives in `src/components/dusk/`: `DuskButton` (variants primary/white/glass/ghost), `DuskScene` (scenic webp + gradient scrim card), `DuskWordmark`.
- Imagery: optimized landing photos in `assets/images/landing/` (`home.webp`, `lake.webp`, `portal-arch.webp`).
- These screens set `<StatusBar style="light" />`.

### Conventions

- **Colors**: ALWAYS use semantic token classes (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-secondary`, `border-border`, `bg-card`, `text-destructive`). Never hardcode hex colors in classNames — they break dark mode. (Dusk surfaces use the fixed `dusk-*` tokens above instead.)
- **Typography**: DM Sans via `font-sans`, `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`.
- **Radius**: `rounded-full` for buttons/pills, `rounded-2xl` for cards/list items, `rounded-xl` for inputs/icon containers.
- **Screen padding**: `px-4` (16px, iOS HIG layout margin) for all content surfaces; `px-6` only on centered hero surfaces (onboarding, sign-in, status screens). Safe areas via `useSafeAreaInsets()` (never `SafeAreaView`); top: `insets.top + 8`.
- **Page titles**: `<Text variant="title">` (28px DM Sans bold), rendered in-screen (tab headers are hidden).
- **Section labels**: `<Text variant="section-label">` (13px uppercase tracking-wider muted).
- **Press feedback**: `active:opacity-70/80/90` on Pressable.
- **Icons**: `@expo/vector-icons` Ionicons; pass raw colors from `useThemeColors()`.
- **Dark mode**: automatic via CSS variables + `prefers-color-scheme`; manual toggle uses nativewind's `useColorScheme().toggleColorScheme()` (exposed via `useAppTheme()` from `app/_layout.tsx`).

## Architecture

### File Structure
```
apps/mobile/
├── app/               # Expo Router routes (screens, modals, tabs)
├── src/
│   ├── components/    # Feature components + ui/ design system
│   ├── screens/       # Screen components
│   ├── contexts/      # AuthContext
│   └── lib/           # auth-client, theme, utils, cva
├── ios/               # iOS native code
├── android/           # Android native code
├── global.css         # Theme tokens (CSS variables)
└── tailwind.config.js # Tailwind/NativeWind config
```

### Key Dependencies
- **Expo + expo-router**: Framework and file-based navigation
- **NativeWind**: Tailwind styling
- **Convex**: Backend data layer (`@convex/_generated/api`)
- **Better Auth**: Authentication (shared with web, Email OTP)
- **react-native-reanimated**: Entrance animations (`FadeInDown`)

## Troubleshooting

- **Metro cache**: Clear with `npx expo start --clear`
- **iOS pods**: Delete `ios/Pods` and run `pod install`
- **Android**: Clean with `cd android && ./gradlew clean`
