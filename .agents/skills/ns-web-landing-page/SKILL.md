---
name: ns-web-landing-page
description: Refresh the NowStack Mobile public landing page style. Use for `/ns web landing-page`, landing redesigns, CapWords/Screen Studio inspired references, and web-app/app/components/landing edits.
---

# Web Landing Page - NowStack Mobile

<objective>
Update the public `/` landing page in `web-app/` using live visual references, user-approved style direction, and real browser screenshots. This skill is for changing the marketing page style and section design, not for changing the signed-in `/app`, `/admin`, mobile app, backend, deploys, or store metadata.
</objective>

<required_context>
Before editing, read these files:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,220p' .agents/rules/web-app.md
sed -n '1,220p' .agents/rules/verification.md
sed -n '1,220p' .agents/rules/typescript-and-code-style.md
sed -n '1,220p' site-config.ts
sed -n '1,220p' web-app/app/routes/index.tsx
rg --files web-app/app/components/landing web-app/app/components/ui
```

Then read at least three relevant landing files, usually:

```bash
sed -n '1,260p' web-app/app/components/landing/landing-hero.tsx
sed -n '1,260p' web-app/app/components/landing/landing-primary-features.tsx
sed -n '1,220p' web-app/app/components/landing/landing-header.tsx
```
</required_context>

<reference_research>
Use `/Users/melvynx/.agents/skills/dev-browser/SKILL.md` for visual reference capture. If the user gives URLs, prioritize those. If they only says "like CapWords" or "like Screen Studio", start with:

- `https://capwords.app/`
- `https://screen.studio/`

For more options, open `references/design-swipe-file.md`. It contains the two seed references, 20 polished app/product landing pages, and 20 original consumer/mobile app landing pages.

When the user asks to find new references, use `/Users/melvynx/.agents/skills/exa-search/SKILL.md` for broad source discovery, then verify selected URLs with `dev-browser`.
</reference_research>

<screenshot_workflow>
Capture each chosen reference before proposing edits:

```bash
dev-browser --timeout 45 <<'EOF'
const targets = [
  { name: "capwords", url: "https://capwords.app/" },
  { name: "screen-studio", url: "https://screen.studio/" },
];

for (const target of targets) {
  const page = await browser.getPage(`landing-ref-${target.name}`);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(target.url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const desktop = await saveScreenshot(
    await page.screenshot({ fullPage: false }),
    `${target.name}-desktop.png`,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const mobile = await saveScreenshot(
    await page.screenshot({ fullPage: false }),
    `${target.name}-mobile.png`,
  );

  const title = await page.title();
  const text = (await page.locator("body").innerText().catch(() => "")).slice(0, 1400);
  console.log(JSON.stringify({ name: target.name, url: page.url(), title, desktop, mobile, text }, null, 2));
}
EOF
```

If a cookie banner or modal blocks the hero, close it or choose the least-invasive cookie option, then recapture. If it cannot be dismissed, keep the screenshot and mention the obstruction.
</screenshot_workflow>

<user_alignment_gate>
Before editing the landing page, show the captured reference screenshots or paths and ask the user what to keep and what to change. Keep the question short:

- Which reference should lead the direction?
- What should we keep: palette, type, hero layout, product demo, motion, section rhythm, social proof, pricing style?
- What should we avoid or change?

Do not copy a reference site wholesale. Do not reuse their screenshots, logos, app imagery, trademarks, copy, or unique branded illustrations. Translate the approved direction into this product's own UI, copy, and assets.
</user_alignment_gate>

<implementation_rules>
- Edit the existing landing system under `web-app/app/components/landing/` and `web-app/app/routes/index.tsx`; do not create a second web app or a parallel landing app.
- Keep public routes renderable without Convex env. The landing page must not depend on signed-in data.
- Pull product facts, URLs, pricing, and store links from `site-config.ts`; do not invent legal company details, product ids, prices, or external links.
- Keep `/app` and `/admin` visually separate from the marketing treatment. Do not apply hero styling or decorative marketing UI to admin surfaces.
- Use existing `web-app/app/components/ui/` primitives and `lucide-react` icons when useful.
- Prefer real product visuals: actual app screens, phone/browser frames, product UI states, short demos, or generated product-specific images. Avoid generic atmospheric art.
- Avoid one-note palettes, decorative gradient orbs, bokeh blobs, and marketing text that explains how the UI works.
- Ensure every button, card, and nav label fits on mobile. Use stable dimensions for mockups, feature tiles, pricing blocks, and toolbars.
- Keep copy concise and product-specific. The first viewport must clearly show the app/product, not just abstract brand text.
- Use `trash`, never `rm -rf`, for deleting temporary files.
</implementation_rules>

<recommended_directions>
Use these as starting patterns after the user chooses a direction:

- CapWords-like: warm white canvas, editorial headline with one accent word, large real-world/product image, award/trust badges, tactile mobile screenshots, everyday use-case sections.
- Screen Studio-like: dark hero, single giant promise, centered product demo/video, crisp CTA, motion-led explanation, social proof row, feature sections that show the product doing the work.
- Hybrid app launch: light hero for approachability, dark product-demo band for depth, app-store CTA near the top, pricing and FAQ near the bottom.
</recommended_directions>

<verification>
Run checks after edits:

```bash
cd web-app && npm run typecheck
cd web-app && npm run build
```

Then verify with `dev-browser`. Start the web app first if needed:

```bash
cd web-app && npm run dev
```

Capture desktop and mobile screenshots:

```bash
dev-browser --timeout 30 <<'EOF'
const page = await browser.getPage("nowstack-landing");

await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const desktop = await saveScreenshot(await page.screenshot({ fullPage: false }), "nowstack-landing-desktop.png");

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
const mobile = await saveScreenshot(await page.screenshot({ fullPage: true }), "nowstack-landing-mobile.png");

console.log(JSON.stringify({ url: page.url(), title: await page.title(), desktop, mobile }, null, 2));
EOF
```

Inspect the screenshots before reporting done. Fix obvious overlap, blank media, unreadable contrast, broken sticky nav, clipped buttons, mobile overflow, or missing primary CTA.
</verification>

<success_metrics>
- User selected or approved the reference direction before implementation.
- `/` keeps the existing route contract and uses this product's own content.
- Desktop and mobile screenshots show a polished, non-overlapping first viewport.
- `cd web-app && npm run typecheck` passes.
- `cd web-app && npm run build` passes unless a clearly unrelated baseline failure is documented.
</success_metrics>
