---
name: ns-ui
description: Route NowStack Mobile UI work to the right design/build skill while enforcing a clear, user-first UX bar. Use for any "build/design/redesign/polish the UI" request on the mobile app, web app, landing, or admin — when the surface or the right skill is underspecified.
---

# UI - NowStack Mobile

The routing skill for any UI work in this repo. Pick the right specialist skill for the surface, **but the UX bar below is non-negotiable and applies no matter which skill you route to.** A screen that looks good but is unclear, cramped, or breaks platform conventions does not pass.

## Mandatory First Step

Read the rule file(s) for the surface you'll touch before editing:

- Mobile (`mobile-app/**`): `.agents/rules/mobile-app.md` + `.agents/skills/ns-init-project/references/theming.md`
- Web / landing / admin (`web-app/**`): `.agents/rules/web-app.md`
- Either surface: `.agents/rules/typescript-and-code-style.md`

Then identify the surface (mobile vs web), the task type (new screen, redesign, single component, polish, copy, brand art), and **read at least 3 existing files** — a similar screen, its caller, and an imported `components/ui/` primitive — before writing anything new.

## The UX Bar (non-negotiable — enforce on every route)

Whatever skill builds the UI, the result MUST satisfy all of these:

1. **Clarity first.** One primary action per screen, obvious at a glance. The user should never wonder "what do I do here?" Reduce choices; don't decorate.
2. **Visual hierarchy.** Size, weight, spacing, and color encode importance. Generous whitespace. No wall-of-controls; group related things.
3. **Reuse the system.** Use existing `components/ui/` primitives and the CVA Button/Text/Card before inventing screen-local styling. Match the surrounding code's idioms.
4. **One source of truth for color.** Mobile themed surfaces come from `mobile-app/lib/theme.ts` via semantic tokens (`bg-background`, `text-foreground`, `bg-brand`) or `useTheme().colors` for native APIs — never inline a themed hex. Web uses the design tokens, not one-off Tailwind colors.
5. **States are designed, not afterthoughts.** Handle empty, loading, error, and success. No raw spinners where a skeleton or message belongs.
6. **Touch & keyboard ergonomics (mobile).** Tap targets ≥44pt. Any screen with a `TextInput` keeps inputs *and* the submit button above the keyboard (`KeyboardAvoidingView` on the outer/bottom-panel container — see `.agents/rules/mobile-app.md`).
7. **Platform-native feel.** Respect iOS/Android conventions (native tabs, sheets, SF Symbols on iOS). Don't fight the OS surface.
8. **Accessible & legible.** Sufficient contrast in both themes, no text overflow/truncation at small widths, readable type scale, labels on icon-only controls.
9. **Copy is part of the UI.** Microcopy is plain, specific, and action-oriented. No jargon, no dead-end errors.
10. **No default decoration.** Avoid gradients/orbs/emojis unless explicitly requested (per repo style rules).

If a routed skill's output violates any of these, fix it before reporting done.

## Route To A Specific Skill

### Mobile (Expo Router / React Native)
- Native screen, navigation, layout, animation, native tabs, Liquid Glass, Expo Symbols: **`building-native-ui`**
- Real native components (`@expo/ui` SwiftUI/Compose) — grouped settings forms, native sheets, pickers, sliders, menus where RN components fall short: **`expo-ui`**
- RN performance, lists, animation correctness, native-module UI patterns: **`vercel-react-native-skills`**
- In-context dialog, bottom sheet, drawer, modal form (instead of a new route): **`mobile-dialog-sheets`**
- Apply a named mobile visual style: **`use-mobile-style`**
- App icon, splash, onboarding/brand art: **`ns-images`**

### Web (TanStack Start / shadcn / Tailwind v4)
- shadcn components, registries, composition, fixing/styling shadcn UI: **`shadcn`**
- Polished production web pages, dashboards, React components, visual redesigns: **`frontend-design`**
- Apply a named web visual style (ios-app, linear, stripe, vercel-simple, …): **`use-style`**
- Public landing page refresh/redesign: **`ns-web-landing-page`**

### Either surface — design quality & UX
- Deep UI/UX review, polish, hierarchy, accessibility, motion, redesign critique: **`impeccable`**
- General frontend design guidelines / heuristics: **`web-design-guidelines`**
- Make a bland/awkward interface feel better: **`make-interfaces-feel-better`**
- Improve unclear copy, labels, error messages, microcopy: **`clarify`**

If a specific skill clearly matches, invoke it (it carries the deep know-how) — then return here to validate the result against **The UX Bar**. If none matches (a small, well-understood change), build it directly while honoring the bar and repo rules.

## Repo Constraints

- Mobile lives in `mobile-app/`, web in `web-app/`. There is no `admin-web`/`landing-web` — admin is `/admin` inside `web-app`.
- Keep Expo Router route groups (`(app)`, `(auth)`, `(flow)`) in hrefs; bottom bar is `NativeTabs` (don't set its `backgroundColor`).
- `/admin` stays dense and operational (no marketing cards); dev affordances use yellow, admin-only affordances use orange.
- Public web routes must render without Convex env.
- Path aliases: `@/*` inside app folders, `@convex/*` for backend, `@site-config` for shared config. No new barrel `index.ts`.

## Default Verification

Mobile changes:
```bash
cd mobile-app && npx tsc --noEmit && npm run lint
```
Then verify on the Simulator with the **`/ns-ios-verification`** skill (never computer-use).

Web changes:
```bash
cd web-app && npm run typecheck
cd web-app && npm run build   # for route/config changes
```
Then verify routes with the **`/dev-browser`** skill at a desktop and a mobile viewport.
