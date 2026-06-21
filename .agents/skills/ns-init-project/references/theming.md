# Mobile theming — dual theme & the Mono Theme procedure

How color works in `mobile-app/`, and how to ship a **single-theme** app (e.g. dark-only)
in one shot without leaving orphaned light surfaces behind (the classic "tab bar stayed
white" bug).

## Architecture (single source of truth)

Every color lives in **`mobile-app/lib/theme.ts`** as `themes.light` / `themes.dark`.
From there it reaches the UI two ways:

1. **Tailwind/NativeWind classes** (`bg-background`, `text-foreground`, …). `tailwind.config.js`
   maps each token to a CSS variable (`var(--color-*)`). `ThemeProvider`
   (`lib/theme-store.tsx`) sets those variables at runtime with NativeWind `vars()`, so
   changing scheme reskins every class — no `dark:` duplication.
2. **Native APIs that can't take a className** — tab bar, `Stack` `contentStyle`,
   `StatusBar`, `ActivityIndicator color`, `placeholderTextColor`, SVG strokes. These read
   `const { colors } = useTheme()` and pass `colors.<token>`.

`global.css :root` holds the light values as the first-paint default before the provider
mounts. `app.config.ts` sets `userInterfaceStyle: 'automatic'` so `system` can resolve dark.

**Rule:** never inline a hex for a themed surface. Add/adjust the token in `theme.ts` and
read it from a class or `useTheme().colors`.

### Intentional fixed colors (NOT theme bugs)

A few colors are deliberately constant regardless of theme — leave them:
- Apple sign-in buttons: `bg-black` + `text-white` (Apple brand requirement).
- Text/icons overlaid on a full-bleed image (onboarding TopBar, paywall close button):
  `text-white`, `bg-white/30`, `bg-black/20`.
- Colored badges (`components/ui/badge.tsx`): white text on a saturated fill.

## Color touchpoint checklist

When changing or auditing theme colors, every one of these must resolve from `theme.ts`.
This is the anti-"missed surface" list — a Tailwind token edit alone does NOT cover the
native ones:

- `lib/theme.ts` — the token values (light + dark).
- `tailwind.config.js` — token → `var(--color-*)` mapping.
- `global.css :root` — first-paint defaults.
- `app.config.ts` — `userInterfaceStyle`.
- `lib/theme-store.tsx` — provider, `StatusBar` style, persistence.
- `app/(app)/(tabs)/_layout.tsx` — tab bar bg / border / active+inactive tint.
- `app/(app)/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(flow)/_layout.tsx`,
  `app/onboarding/_layout.tsx` — `Stack` `contentStyle.backgroundColor`.
- `components/ui/loading.tsx`, `components/ui/header.tsx`, `components/ui/input.tsx`,
  `components/ui/continue-button.tsx` — spinner / surface / placeholder colors.
- Any screen passing `color=` / `placeholderTextColor=` to a native component.

Quick audit:
```bash
cd mobile-app
grep -rnoE "#[0-9A-Fa-f]{6}\b" app components --include="*.tsx" --include="*.ts"
# Every hit should be an intentional fixed color (see list above), never a themed surface.
```

## Mono Theme procedure (dual → one locked theme)

Use when the product wants a **single** theme (most often dark-only). Goal: lock the active
scheme, delete the switcher, and leave exactly ONE block to edit afterward.

Target scheme below is `dark` — swap for `light` if that's the single theme.

1. **Lock the resolver** — `lib/theme-store.tsx`: force the constant and make the setter a
   no-op so nothing can change it.
   ```ts
   const resolved: ColorScheme = 'dark'; // MONO THEME: locked
   const setPreference = () => {}; // MONO THEME: switching disabled
   ```
   Keep the `vars()` + `StatusBar` wiring; just stop computing from system/preference.
2. **Remove the switcher** — `app/(app)/(tabs)/settings.tsx`: delete the `AppearanceToggle`
   component and the "Appearance" `<View>` section (both are tagged with a `MONO THEME:`
   comment).
3. **Lock the native appearance** — `app.config.ts`: `userInterfaceStyle: 'dark'`.
   `StatusBar` already follows `resolved`, which is now constant.
4. **Fix the first paint** — `global.css :root`: replace the light defaults with the dark
   hex values from `themes.dark`, so frame zero matches.
5. **Mark the unused block** — `lib/theme.ts`: add a banner above the unused scheme so no
   one (human or AI) wastes time editing it.
   ```ts
   // MONO THEME: `light` is UNUSED — do not edit. Edit `dark` only.
   light: { /* … */ },
   ```
6. **From now on, edit only `themes.dark`.** Because every surface resolves from there, one
   edit reskins the whole app — tab bar, headers, layouts, status bar, spinners included.

### Re-enabling dual theme

Reverse the steps: restore the `resolved`/`setPreference` logic in `theme-store.tsx`,
re-add the Appearance section in `settings.tsx`, set `userInterfaceStyle: 'automatic'`,
restore light values in `global.css :root`, and remove the "unused" banner in `theme.ts`.

## Verify

```bash
cd mobile-app && npx tsc --noEmit && npm run lint
```
Then in the simulator confirm the tab bar, headers, layout backgrounds, status bar, and
spinners all match the locked (or toggled) scheme — no white surface left behind.
