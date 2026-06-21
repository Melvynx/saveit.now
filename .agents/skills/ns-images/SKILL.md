---
name: ns-images
description: Generate a NowStack Mobile app icon, onboarding backgrounds, and splash with AI image generation. Use for "create my app icon", "generate onboarding images", "make brand art", "redo the icon". REQUIRES an image-gen tool (Codex/gpt-image); other agents follow the fallback.
---

# Brand Images - NowStack Mobile

Generate the app icon, onboarding backgrounds, splash, and brand artwork with AI image generation.

<capability_gate>
**This workflow requires an image-generation tool** (Codex's `imagegen` skill backed by gpt-image, or any model/agent that can generate raster images).

- **Codex**: invoke the `imagegen` skill with the prompts below. Generated files land in `~/.codex/generated_images/<session-id>/ig_*.png` — copy them into the repo.
- **Agent WITHOUT image generation (e.g. Claude Code without an image tool)**: do NOT fake it (no SVG-to-PNG pipelines — that approach was tried on a real app and produced flat, amateur results that were thrown away). Instead: build the final prompts from the templates below, give them to the user to run in their image tool of choice, then resume at the Post-Processing phase with the files they provide.
</capability_gate>

<objective>
Produce every brand asset the app needs from `site-config.ts` (brand colors, mascot/concept, product tone), with prompts that are proven to yield premium, store-quality results on a real app shipped from this boilerplate.

| Asset | Target file | Spec |
| --- | --- | --- |
| App icon | `mobile-app/assets/icon.png` | 1024x1024, square, NO transparency, no rounded mask |
| Android adaptive icon | `mobile-app/assets/adaptive-icon.png` | foreground layer, subject inside the central ~66% safe circle |
| Splash | `mobile-app/assets/splash.png` | simple, centered mark on flat brand background |
| Onboarding backgrounds | `mobile-app/assets/onboarding/*.png` | 9:19.5 portrait (e.g. 1290x2796), one per onboarding slide, composed for the actual onboarding overlay safe zone |
| Favicon | `mobile-app/assets/favicon.png` | 192x192 from the icon |
</objective>

<layout_audit_required>
Before generating onboarding backgrounds, inspect the real app layout. Do not rely on generic wallpaper composition.

1. Read the onboarding route and content files, usually:
   - `mobile-app/app/onboarding/index.tsx`
   - `mobile-app/app/onboarding/content.ts`
   - any auth/paywall screens that reuse onboarding images
2. Identify how the image is rendered:
   - `resizeMode="cover"` means the image can be cropped.
   - full-screen absolute images behind a bottom sheet hide the lower part of the artwork.
   - `ImageBackground` and plain `Image` can crop differently depending on parent height.
3. Estimate the real hidden bottom region from code and screenshots. The default NowStack onboarding bottom sheet is often closer to **35-42%** of an iPhone screen, not 28%, when title, subtitle, buttons, pricing, or option rows are present.
4. If the bottom sheet height varies by step, compose for the worst case, not the easiest welcome slide.

Never approve onboarding art only because the source file is the correct ratio. The only pass condition is: the meaningful subject remains visible in the rendered app, above the overlay, on an iPhone simulator screenshot.
</layout_audit_required>

<prompt_anatomy>
Every prompt follows this structure (battle-tested; deviating produces generic results):

1. `Use case:` — `logo-brand` for icons, `illustration-story` for onboarding/marketing art.
2. `Asset type:` — exact target ("iOS app icon for <App>, 1024x1024 square", "mobile onboarding background for <App>").
3. `Primary request:` — quality bar + anti-style ("clean, modern, high-end raster illustration. No SVG/vector look, no flat icon art").
4. `Composition:` — aspect ratio AND safe zones (see below — this is what makes or breaks onboarding images).
5. `Scene/Subject/Style:` — separate lines; mascot/concept from the product brief.
6. `Color:` — named palette derived from `site-config.ts > brand` ("warm peach", "sage green"), not hex codes.
7. `Avoid:` — always end with: `text, logos, UI, phone frame, screenshots, watermarks, tiny hidden subject, harsh outlines, clutter, flat SVG look`.
</prompt_anatomy>

<icon_recipe>
Template (adapt subject + palette to the product):

```
Use case: logo-brand
Asset type: iOS app icon for <AppName>, 1024x1024 square.
Primary request: Create a modern, professional iOS app icon for <one-line product description>. Make it feel polished, premium, and native to iOS, not flat or amateur.
Subject: <single centered mark — mascot head or abstract symbol>, highly readable at small sizes.
Style/medium: modern 3D-ish iOS app icon, smooth gradients, subtle depth, crisp geometric symbol, no photoreal objects.
Composition/framing: centered icon mark with generous safe padding, no text, no border, full square artwork suitable for iOS masking.
Color palette: <brand primary> background with tasteful depth, <contrast color> main symbol.
Materials/textures: smooth matte/glass-like iOS icon finish, subtle shadow and highlight, clean vector-like edges.
Constraints: no words, no letters, no watermark, no mockup phone, no rounded-corner mask baked into the icon, no transparent background, no tiny details, no complex scene. Must remain readable at 60px. Output should be a finished app icon artwork.
```

Non-negotiable for iOS: **no baked rounded corners** (iOS applies the mask), **no transparency** (App Store rejects alpha in the marketing icon), **readable at 60px**.
</icon_recipe>

<onboarding_recipe>
The critical insight from production: onboarding screens overlay a rounded bottom sheet that can cover **35-42%** of the image on real devices. Without explicit safe-zone instructions, generated images often look good as files but hide their subject behind the card once rendered. Template:

```
Use case: illustration-story
Asset type: mobile onboarding background for an iPhone app named <AppName>
Primary request: Create a clean, modern, high-end generated raster illustration for the <slide purpose> screen. No SVG/vector look, no flat icon art.
Composition: vertical 9:19.5 mobile wallpaper. The artwork will be rendered with resizeMode cover behind a rounded bottom sheet, so the important subject must sit in the upper 45-55% of the canvas and remain readable if the lower 42% is covered. Keep the bottom 42% visually calm, dark/simple, and free of important subject matter. Keep generous side padding so cover-cropping on tall iPhones does not cut the subject.
Scene/backdrop: <scene matching the slide's message>, polished app-store quality, soft depth, subtle atmospheric light.
Subject: <mascot/characters doing something that tells this slide's story>, friendly but not childish.
Style: clean modern 3D illustration, soft rounded forms, premium mobile app onboarding art, gentle warm lighting, crisp subject.
Color: <brand palette as names>, high contrast enough to read on a phone.
Avoid: text, logos, UI, phone frame, screenshots, important objects below the vertical midpoint, huge empty sky, tiny hidden subject, harsh outlines, noisy clutter, stock photo look, flat SVG look, visible watermarks.
```

Generate one image per onboarding slide (see `mobile-app/app/onboarding/content.ts` for the slide list), each with a scene that matches that slide's message. Symbolism only — "glowing answer bubbles", "abstract chart shapes" — never readable text in the artwork.
</onboarding_recipe>

<generation_loop>
1. Generate the batch (all onboarding slides + icon).
2. **Visually inspect every output** (open/read the images): subject in the upper 45-55%? bottom 42% calm? readable at small size (icon)? no accidental text/watermark?
3. Reject and regenerate what fails — refine the prompt, don't accept "almost".
4. **Safety-filter gotcha**: a prompt can be rejected for ambiguous wording with harmless content. Reword to simple, neutral, single-paragraph phrasing and retry.
5. Minor fixes (e.g. bottom zone too busy on one image) can be patched with ImageMagick (blurred fade extension) instead of regenerating.
6. Check the generated art against the actual UI crop. If `resizeMode="cover"` plus the bottom sheet hides the subject, either regenerate with a higher subject placement or patch the app image style to lift/position the background consistently.
</generation_loop>

<post_processing>
```bash
# copy from the generator output into the repo
mkdir -p mobile-app/assets/onboarding
cp <generated>.png mobile-app/assets/onboarding/<slide-name>.png

# icon: enforce 1024x1024 and strip alpha (App Store requirement)
sips -z 1024 1024 icon-raw.png --out /tmp/icon-1024.png
magick /tmp/icon-1024.png -background "<brand-bg-color>" -alpha remove -alpha off mobile-app/assets/icon.png
# (no ImageMagick? `sips -s format jpeg` then back to png also strips alpha)

# favicon + verification
sips -z 192 192 mobile-app/assets/icon.png --out mobile-app/assets/favicon.png
sips -g pixelWidth -g pixelHeight -g hasAlpha mobile-app/assets/*.png
```

Wire onboarding images as bundled assets (NOT remote URIs): in `mobile-app/app/onboarding/content.ts` use `require("@/assets/onboarding/<name>.png")` and type images as `ImageSourcePropType`. Then:

```bash
cd mobile-app && npx tsc --noEmit && npm run lint
```

Remember: **icon and splash changes require a native rebuild** (`npm run ios`) — they will not appear on hot reload. Onboarding images are JS assets and reload normally.
</post_processing>

<render_verification>
After wiring onboarding images, verify the real rendered app. File inspection is not enough.

1. Start Metro for the current project on an explicit port that is not already used:
   ```bash
   cd mobile-app && npx expo start --port 8082 --dev-client --clear
   ```
2. If another Expo app is already listening on 8081, do not use 8081. Cross-project Metro contamination can make the simulator show stale NowStack screens from another repo.
3. Open the Metro root URL and confirm the manifest before launching:
   - `extra.expoClient.name` matches `site-config.ts`
   - `extra.expoClient.slug` matches the current app
   - `extra.expoClient._internal.projectRoot` is the current repo
   - `launchAsset.url` points to the explicit port you started
4. Prefer a fresh simulator for visual QA when branding/assets changed:
   ```bash
   UDID=$(xcrun simctl create "BrandVerify-$(date +%Y%m%d-%H%M%S)" com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro com.apple.CoreSimulator.SimRuntime.iOS-26-1)
   xcrun simctl boot "$UDID"
   xcrun simctl bootstatus "$UDID" -b
   cd mobile-app && npx expo run:ios --device "$UDID" --port 8082
   ```
5. Capture at least the welcome step and one dense step with options/pricing:
   ```bash
   xcrun simctl io "$UDID" screenshot /tmp/onboarding-welcome.png
   ```
6. Fail the run if screenshots show the previous product name, old remote backgrounds, or the subject hidden behind the bottom sheet. Fix before reporting completion.
</render_verification>

<failure_modes>
- Generated icon has transparency or baked rounded corners → App Store rejection; strip alpha, regenerate without mask.
- Onboarding subject hidden behind the bottom card → prompt used wallpaper composition instead of the real overlay safe zone, or the UI uses `cover` without lifting/positioning the background.
- Correct image files but wrong rendered app → simulator loaded another Metro server or stale dev-client URL; verify the manifest `projectRoot`, app name, slug, and port.
- Flat/amateur output → prompt missed the "No SVG/vector look" + "premium/app-store quality" anchors.
- Prompt rejected by safety filter → reword neutrally, simplify; content was almost certainly fine.
- Images bloat the bundle (>2MB each) → run `npx expo-optimize` or pngquant if available; acceptable up to ~1.8MB per onboarding image.
</failure_modes>
