---
name: ns-icon
description: Generate NowStack Mobile app icons and logos. Use for `/ns icon`, app icon, iOS logo, launcher icon, favicon, or logo refresh. By default ALWAYS generate exactly 8 different iOS-quality icon candidates first, then finalize one icon and derive app/web assets.
---

# App Icon - NowStack Mobile

Generate a store-quality icon/logo system from the product concept and brand palette.

This skill is based on the stronger Glow AI runs:

- "Mettre à jour favicon et logos" worked because it used a precise `ns-images`-style iOS app icon prompt, then derived favicon/logos from that source.
- "Générer 8 icônes d’application" improved only after switching to the built-in `imagegen` path and treating the first pass as **clean logo-mark exploration**, not heavy 3D app-icon blobs.

**Scope:** app icon and logo assets: iOS icon, Android adaptive icon, favicon/web icons, and optional splash/logo derivations when the app already expects them. Onboarding backgrounds and non-icon brand art stay in `.agents/skills/ns-images/SKILL.md`.

**Default behavior is non-negotiable:** generate **exactly 8 different iOS-quality icon candidates first**. Do not generate 1, 2, 4, or "a few" candidates. Do not start by generating only one final icon. Do not skip the 8-candidate stage just because an existing icon or previous generated image exists, unless the user explicitly says: "do not generate candidates" or "use this exact icon as the final source."

<required_context>
Before generating anything, read:

1. `site-config.ts` for app name, product concept, brand colors, and tone.
2. `mobile-app/app.config.ts` or `mobile-app/app.json` for current icon/adaptive/splash paths and background colors.
3. Existing assets under `mobile-app/assets/` and web public/icon files so stale default art is not reused accidentally.
4. If the user says to use a recently generated image, inspect `~/.codex/generated_images/` and any repo `.agents/artifacts/` folders before regenerating.

Use any user-provided screenshot, brief, generated image, or selected candidate as the visual source of truth.
</required_context>

<quality_bar>
The winning result should feel like a real app brand system, not a generic AI-generated icon.

Pass criteria:

- One simple, ownable mark that is readable at favicon/home-screen size.
- Clean logo logic first: crisp geometry, balanced negative space, no clutter.
- Every default candidate should already feel like a polished iOS app icon direction: full square artwork, premium, native to iOS, app-store ready, and readable at 60px.
- Final iOS source can be lightly dimensional, luminous, and app-store ready, but must not become a glossy blob or random 3D object.
- Full square artwork for launcher icons: no transparency, no baked rounded corners, no white corner halo.
- No text, letters, numbers, monograms, UI, screenshots, watermarks, realistic faces, phone mockups, or trademarked logos.

Reject immediately:

- Flat black-on-white pictogram with no brand system value.
- Heavy 3D mascot/blob look when the product needs a clean mark.
- Dark vignette, smoky blur, complex scene, tiny hidden subject, harsh outline, or over-detailed illustration.
- Icon-in-icon framing, baked rounded app icon mask, border, transparent corners.
</quality_bar>

<workflow>
Use a two-phase workflow for new icons.

1. **Generate exactly 8 different iOS-quality icon candidates** with the built-in `imagegen` path when available. The first pass explores eight finished-feeling directions, not flat placeholder logos and not one single final icon.
2. **Select the strongest mark** by visual inspection and 60px readability.
3. **Finalize one iOS-quality app icon** from that selected direction.
4. **Derive required assets** from the final source image.

If the user asks for an app icon, launcher icon, logo refresh, favicon update, or `/ns icon`, the default action is still to generate exactly 8 different iOS-quality icon candidates first. Skip this only when the user explicitly instructs you to use one exact source image and not generate candidates.
</workflow>

<quality_loop>
Do not treat image generation as a one-shot command. The quality loop is part of the skill.

1. First generation has fewer than 8 usable candidates? Regenerate. Do not continue until there are exactly 8 different iOS-quality candidate directions.
2. First generation weak or too "AI icon" looking? Keep the prompt intent as `logo-brand`, but make the sheet cleaner: centered geometric marks, full square icon artwork, subtle iOS depth only, no glossy blobs, no dark vignettes, no complex 3D scenes.
3. Good 8-candidate sheet but no final app icon yet? Select the best candidate, then run the iOS icon prompt. Do not install the exploration sheet itself as the launcher icon.
4. Good final icon but weak derived assets? Keep the source icon and fix post-processing/splash/favicon derivation. Do not regenerate the brand mark unless the source art itself is wrong.
5. User says they do not like the logos? Generate a new 8-candidate sheet with a different visual strategy. Do not keep iterating on the same bad aesthetic.
6. Always show or reference the overview sheet and individual candidates before overwriting app assets, unless the user asked for fully autonomous replacement.
</quality_loop>

<tool_choice>
Prefer generators in this order:

1. Codex `imagegen` skill / built-in `image_gen` tool for both the 8-mark exploration and final iOS icon.
2. `gemini-cli image generate --model gemini-3-pro-image-preview` if imagegen is not available.
3. Any other raster generator.

Do not fake image generation with SVG/canvas exports. If no image tool is reachable, give the user the filled prompts and resume from post-processing when they provide images.
</tool_choice>

<phase_1_prompt>
Use this prompt for the first pass. It deliberately asks for 8 different **iOS-quality app icon candidates** with clean logo logic and the same premium quality anchors as the successful Glow AI icon prompt.

```text
Use case: logo-brand
Asset type: 8 different iOS app icon candidates for <AppName>, each 1024x1024-style square artwork.
Primary request: Create a premium icon exploration sheet for <AppName>, an app that <short product concept>. Make every candidate feel modern, professional, polished, native to iOS, and app-store ready, not flat or amateur.

Create exactly 8 distinct app icon candidate directions arranged in a clean 4x2 grid. Each candidate should be a standalone full-square icon artwork with a simple centered brand mark, generous safe padding, and enough finish that it could become the final iOS launcher icon after selection. No text, no letters, no numbers, no monograms.

Subject directions to explore: <8 relevant symbolic directions from the product, such as glow, camera aperture, portrait outline, sparkle, photo frame, transformation, assistant, shield, calendar, finance mark, etc.>. Keep every mark simple enough to work at favicon size.

Style/medium: modern 3D-ish iOS app icon design with crisp geometric forms, balanced negative space, smooth gradients, subtle depth, clean edges, and refined highlights. The mark should feel ownable and professional, not like clip art and not like a random generated object.

Composition/framing: each candidate centered in its own full-square brand-colored tile with generous safe padding, no border, no baked rounded-corner mask, all 8 candidates clearly separated. Add a tiny 60px preview beside each candidate if possible.

Color palette: <brand colors as names, not hex>. Use full-bleed brand backgrounds, clean white or light highlights, strong contrast, and at most one refined accent glow. Use a restrained palette: 2-4 colors maximum. Avoid noisy gradients unless the brand requires them.

Materials/textures: smooth matte or lightly glass-like iOS icon finish, subtle shadow and highlight, premium luminous glow only if it supports the brand, clean edges.

Lighting/mood: clean, bright, premium. No dark vignette, no smoky blur, no glossy blob effects, no complex 3D scene.

Constraints: exactly 8 different candidates, no text anywhere, no letters, no numbers, no watermark, no phone mockup, no app-store rounded square masks baked into the artwork, no transparent background, no tiny details, no complicated illustration, no realistic faces, no photos, no 3D mascot unless the product explicitly needs a mascot. Every candidate must remain readable at 60px. Make the icons feel simple, sharp, ownable, professional, and finished.
```
</phase_1_prompt>

<candidate_handling>
After generation:

1. Save the sheet under `.agents/artifacts/imagegen-logo/<date>/` when working in a repo.
2. Visually inspect it.
3. If the sheet is weak, regenerate once with a tighter prompt: simpler marks, less 3D, fewer colors, stronger negative space.
4. Split the 8 candidates into individual PNGs when feasible.
5. Normalize candidate PNGs to `1024x1024`, RGB, no alpha if they may become source assets.
6. Pick the best candidate yourself unless the user is actively choosing. Also report 2-4 backup options.

Selection criteria:

- Recognizable at 60px.
- Distinctive, not generic camera/sparkle unless the app truly needs that.
- Works in one color and in full color.
- Can become both a favicon and an iOS app icon.
- Does not depend on text.
- Already has the premium iOS qualities from the Glow reference: full-bleed background, centered luminous mark, subtle depth, clean edges, no mask baked into the image.
</candidate_handling>

<candidate_output_standard>
When the 8-candidate sheet is strong, make it operational:

- Save the overview as a named sheet, e.g. `app-logo-imagegen-sheet-01.png`.
- Split candidates into `app-logo-imagegen-candidate-01.png` through `app-logo-imagegen-candidate-08.png` when feasible.
- Ensure individual candidates are exact square PNGs, ideally `1024x1024`, RGB, no alpha.
- Keep the raw generated image untouched in `~/.codex/generated_images/`; copy into repo artifacts instead of moving it.
- Report the strongest 1-2 candidates and 2-3 backups with concrete reasons, not vague preference.

If the split files accidentally come out retina-scaled, transparent, or mis-cropped, correct them before using them as source assets.
</candidate_output_standard>

<phase_2_prompt>
Use this for the final standalone icon after selecting a candidate. This mirrors the successful "Mettre à jour favicon et logos" direction: polished iOS app icon, but still based on the clean mark.

```text
Use case: logo-brand
Asset type: iOS app icon for <AppName>, 1024x1024 square.
Primary request: Create a modern, professional iOS app icon for an app that <short product concept>. Make it polished, premium, native to iOS, and app-store ready, not flat or amateur.

Subject: a single centered <selected logo-mark direction>. Keep the mark simple, crisp, and highly readable at small sizes.
Style/medium: modern iOS app icon, clean geometric symbol, smooth gradients, subtle depth, refined highlight, no photoreal objects.
Composition/framing: centered icon mark with generous safe padding, no text, no border, full square artwork suitable for iOS masking.
Color palette: <brand colors as names>. Use a full-bleed brand background, clean highlights, strong contrast, and at most one refined accent glow.
Materials/textures: smooth matte or lightly glass-like iOS icon finish, subtle shadow and highlight, premium luminous glow only if it supports the brand, clean edges.
Constraints: no words, no letters, no numbers, no watermark, no phone mockup, no rounded-corner mask baked into the icon, no transparent background, no tiny details, no complex scene. Must remain readable at 60px. Output should be a finished app icon artwork.
```
</phase_2_prompt>

<post_processing>
Create final assets from the selected standalone final icon.

Target files:

| Asset | Target file | Spec |
| --- | --- | --- |
| iOS app icon | `mobile-app/assets/icon.png` | 1024x1024, square, no transparency, no baked rounded mask |
| Android adaptive icon | `mobile-app/assets/adaptive-icon.png` | foreground layer, subject inside central safe area, padded |
| Mobile favicon | `mobile-app/assets/favicon.png` | 192x192 derived from final icon |
| Web favicons/logos | project-specific files under `web-app/public/` | derive from final icon if present |

Use `sips` for macOS resizing. Use ImageMagick (`magick`) when available for alpha removal, padding, ICO, SVG fallback, and splash derivations.

```bash
SOURCE=.agents/artifacts/imagegen-logo/<date>/selected-icon.png
BG="<brand-bg-color>"

sips -z 1024 1024 "$SOURCE" --out /tmp/ns-icon-1024.png

# If the generator baked a rounded mask, border, or halo, push it off-canvas.
sips -z 1126 1126 /tmp/ns-icon-1024.png --out /tmp/ns-icon-up.png
sips -c 1024 1024 /tmp/ns-icon-up.png --out /tmp/ns-icon-fullbleed.png

sips -s format png /tmp/ns-icon-fullbleed.png --out mobile-app/assets/icon.png

if command -v magick >/dev/null; then
  magick mobile-app/assets/icon.png -background "$BG" -alpha remove -alpha off mobile-app/assets/icon.png
  magick mobile-app/assets/icon.png -resize 66% -background "$BG" -gravity center -extent 1024x1024 mobile-app/assets/adaptive-icon.png
else
  cp mobile-app/assets/icon.png mobile-app/assets/adaptive-icon.png
fi

sips -z 192 192 mobile-app/assets/icon.png --out mobile-app/assets/favicon.png
sips -g pixelWidth -g pixelHeight -g hasAlpha mobile-app/assets/icon.png mobile-app/assets/adaptive-icon.png mobile-app/assets/favicon.png
```

If `web-app/public/` has existing `icon.png`, `apple-icon.png`, `favicon.ico`, `favicon.svg`, or `favicon.png`, update them from the same selected icon. If the app has Convex/email logo assets or splash assets already wired, derive them too only when the user asked for favicon/logos or full logo refresh.

Update `mobile-app/app.config.ts` only when the adaptive icon or splash background color must match the generated asset. Use a sampled/brand background color, not white by default.
</post_processing>

<splash_note>
When deriving a splash from a full square icon, avoid showing the icon's square tile on a similar background. The Glow AI fix was to create a clean centered mark treatment for splash while keeping the full square image for the launcher icon.

If a splash is requested, create it from the mark, not by placing the full square app icon on a flat background. A visible square-on-square splash is a failure even when dimensions are correct.
</splash_note>

<verification>
Run applicable checks after writing assets:

```bash
cd mobile-app && npx tsc --noEmit
cd web-app && npm run typecheck
```

For Convex/email logo changes, run the repo's Convex validation command if available.

Launcher icon and splash changes require a native rebuild (`cd mobile-app && npm run ios` or `npm run android`) before they appear on device. Hot reload is not enough.

Fail the run if:

- The old icon is still visible after rebuild.
- The icon has alpha, double-rounded corners, or white/transparent halos.
- The mark is unreadable at 60px.
- The result feels like a generic generated pictogram rather than a brand mark.
</verification>

<failure_modes>
- One generated icon only: wrong workflow. Generate exactly 8 different iOS-quality icon candidates first.
- Fewer than 8 candidates: wrong workflow. Regenerate until there are exactly 8 distinct directions.
- 8 candidates look like glossy 3D blobs: prompt drifted. Regenerate with "8 different clean icon candidates, vector-friendly, crisp geometry, no 3D scene".
- Final iOS icon is too flat: keep the selected mark but add subtle iOS polish, full-bleed background, highlights, and depth.
- Splash shows a square tile: derive a separate centered mark splash treatment.
- Android adaptive icon crops the mark: reduce foreground size below 66% or regenerate with safer padding.
- Icon unchanged in app: rebuild native app.
</failure_modes>
