# Verification Browser (email OTP + Convex evidence)

Use this when verifying local or deployed UI, screenshots, navigation, interactions, auth, or any browser-visible behavior in SaveIt.now.

## When this applies

- The user asks to "verify", test a feature in the browser, check UI behavior, or confirm an authenticated flow.

## Rules

- **ALWAYS** use the `dev-browser` skill for browser verification.
- **ALWAYS** use email OTP for app login during verification when login is needed.
- Use a disposable test account email ending in `@playwright.dev` (e.g. `claude-verify@playwright.dev`) so test data never mixes with real accounts.
- Read the OTP from Convex — it is stored in plaintext in the Better Auth component's `verification` table as `"CODE:attempts"`.

## Proven sign-in recipe (works every time)

1. Check the dev server: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → expect `200`. If not running: `pnpm dev` at the repo root.

2. Trigger the OTP from the browser:

```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.context().clearCookies(); // avoid stale-session crashes
await page.goto("http://localhost:3000/signin", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.locator('input[placeholder="you@example.com"]').fill("claude-verify@playwright.dev");
await page.getByRole("button", { name: /send code/i }).click();
await page.waitForTimeout(4000);
console.log(page.url()); // should show step=otp
EOF
```

3. Read the latest OTP from the Convex dev deployment:

```bash
cd packages/backend && npx convex data --component betterAuth verification --limit 1 --order desc
# value column = "123456:0" → the code is 123456
```

4. Enter the code (the OTP field is the first input on the page):

```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.locator('input').first().fill("123456");
await page.waitForTimeout(5000);
console.log(page.url()); // should be /app
EOF
```

## Verifying bookmark processing end to end

- Add a URL via the "Add a bookmark" card (`input[placeholder="https://example.com"]` + the "Add" button).
- The pending card must appear instantly (reactive grid — no reload) and animate through steps ("Pending" → "Scrapping the content" → …) driven by `processingStep`.
- The card must flip to the finished card (screenshot preview + favicon + title) when the workflow completes.
- Server-side evidence:
  - `npx convex data bookmarks --limit 1 --order desc` — expect `status: "READY"`, `preview`, `summary`, `embeddingModel` populated.
  - `npx convex data --component workflow onCompleteFailures` — must be empty.
  - `npx convex data --component workflow workflows` — empty after success (journal is cleaned up in `onComplete`); failed runs keep their journal for `restart`.
  - `npx convex logs --history 50` for function errors.

## Gotchas

- **"Something went wrong! UNAUTHORIZED" overlay on /app**: stale browser auth state — run `await page.context().clearCookies()` then redo the sign-in recipe. Client queries are gated on `useConvexAuth().isAuthenticated`, so this only happens with corrupted cookie/localStorage state.
- OTP codes expire after 5 minutes; re-trigger and re-read if stale.
- URLs pasted with trailing punctuation (e.g. `…/page:`) 404 on fetch and produce a minimal READY bookmark without preview (`metadata.fetchFailed: true`) — this is expected behavior, not a bug.
- The OTP `verification` row is the **most recent** one; if multiple sign-ins are in flight, match the `identifier` column (`sign-in-otp-<email>`).
