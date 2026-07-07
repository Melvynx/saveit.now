---
name: ns-ios-deeplink
description: Fix and verify iOS Universal Links, TestFlight deeplinks, AASA files, Expo Router callback URLs, associated domains, and sign-in returnTo flows in NowStack Mobile apps.
---

# ns-ios-deeplink - iOS deeplinks for NowStack Mobile

Use this when an `https://...` link should open the iOS app but stays in Safari, or when a TestFlight/App Store build opens the app but loses the intended post-auth destination.

This skill is intentionally end-to-end: Universal Links need a correct web AASA file, a signed app entitlement, Expo Router routes that match the web path, safe callback handling, a fresh iOS build, and live Apple/App Store verification. Do not stop at code inspection.

## Read First

Before touching files, read the repo rules and at least three related files:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,220p' .agents/rules/mobile-app.md
sed -n '1,220p' .agents/rules/verification.md
sed -n '1,220p' mobile-app/app.config.ts
sed -n '1,220p' site-config.ts
find mobile-app/app -maxdepth 4 -type f | sort | sed -n '1,160p'
```

If current Apple/Expo/Vercel behavior is unclear, use `/Users/melvynx/.agents/skills/find-docs/SKILL.md` for current technical docs. Prefer local code, shell, `xcrun simctl`, `asc`, and HTTP checks for facts about the current app.

## Mental Model

An iOS Universal Link works only if all layers agree:

1. The user opens an `https://host/path?...` URL.
2. The installed app has an Associated Domains entitlement for exactly that host, e.g. `applinks:tchao.app`. Add every host users can open, including `www` if links use it.
3. Apple can fetch a valid AASA file for that host from `/.well-known/apple-app-site-association` or `/apple-app-site-association`.
4. The AASA file names the exact app ID: `{APPLE_TEAM_ID}.{bundle_id}`.
5. The AASA file's path rules match the incoming URL path.
6. The mobile app has an Expo Router route for the incoming web path, or a resolver that maps it to a native route.
7. If the user is signed out, the app stores a safe native `returnTo` and applies it after auth.

If any layer fails, iOS opens Safari.

## Safety

- Never commit or print `.p8`, `.p12`, provisioning profiles, p12 passwords, or `credentials.json`.
- Use `trash`, never `rm -rf`.
- TestFlight/App Store uploads are externally visible. If the user did not clearly ask to ship, get explicit confirmation before upload.
- When the working tree is dirty, build/release from an isolated worktree and copy only the deeplink patch plus ignored signing files. Do not ship unrelated user changes.
- Do not trust "works in local browser" as proof. Universal Links are decided by iOS and Apple CDN state.

## Phase A - Identify the Failing URL

Record:

```text
url=https://example.com/auth/signin?callbackUrl=%2Fapp%2Fitems%2F123
domain=example.com
path=/auth/signin
callback=/app/items/123
bundle_id=...
apple_team_id=...
app_id={apple_team_id}.{bundle_id}
```

Decode nested callbacks:

```bash
node -e 'const u=new URL(process.argv[1]); console.log({origin:u.origin, pathname:u.pathname, callbackUrl:u.searchParams.get("callbackUrl"), returnTo:u.searchParams.get("returnTo")})' "$url"
```

Find the native destination:

- Conversation/detail URL -> native detail screen.
- Signed-in app URL -> native signed-in route with route group, e.g. `/(app)/...`.
- Unknown or unsafe URL -> home fallback.

## Phase B - Web AASA

Serve both AASA locations unless the host platform gives a strong reason not to:

```text
https://{domain}/.well-known/apple-app-site-association
https://{domain}/apple-app-site-association
```

Rules:

- No auth.
- No redirect.
- No `.json` extension.
- `Content-Type: application/json`.
- Body under 128 KB.
- Prefer narrow path components over `/*` unless the app should hijack the entire site.

Example body:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAMID.com.example.app"],
        "components": [
          { "/": "/auth/signin", "comment": "Open auth callback links in the iOS app" },
          { "/": "/auth/signin/", "comment": "Open auth callback links in the iOS app" },
          { "/": "/app/*", "comment": "Open app links in the iOS app" },
          { "/": "/go/*", "comment": "Open shortlinks in the iOS app" }
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAMID.com.example.app"]
  }
}
```

Implementation options:

- If `web-app` uses TanStack Start, add API/static routes for both AASA paths and include them in any prerender/public path allowlist.
- If deploying to Vercel and the build emits an extensionless static file, add `vercel.json` headers for both paths. Vercel may otherwise serve `application/octet-stream`, which Apple rejects in practice.
- If a static `public/.well-known/apple-app-site-association` conflicts with a dynamic route or wrong content type, replace it carefully and verify the final deployed response.

Verify live web, not just local:

```bash
curl -i -sS "https://$domain/.well-known/apple-app-site-association" | sed -n '1,80p'
curl -i -sS "https://$domain/apple-app-site-association" | sed -n '1,80p'
curl -I -sS "$url" | sed -n '1,60p'
```

Expected:

- `HTTP/2 200` or `HTTP/1.1 200 OK`
- `content-type: application/json` for AASA
- The exact `appID` is present
- The failing URL itself returns a real page/status, not a 404

Then verify Apple's CDN view:

```bash
curl -i -sS "https://app-site-association.cdn-apple.com/a/v1/$domain" | sed -n '1,100p'
```

Expected:

- `200 OK`
- `Content-Type: application/json`
- `Apple-From:` points to the live AASA URL
- Body includes the same app ID and path rules

Apple CDN caching can lag. A new TestFlight install/update is the normal way to refresh iOS association state after a broken AASA has been fixed.

## Phase C - Mobile Config

In `mobile-app/app.config.ts`, ensure the app has Associated Domains for every real host:

```ts
ios: {
  bundleIdentifier: SiteConfig.bundleId,
  associatedDomains: ["applinks:example.com", "applinks:www.example.com"],
  infoPlist: {
    ITSAppUsesNonExemptEncryption: false
  }
}
```

Keep `app.config.ts` plain-JS-evaluable as required by `.agents/rules/mobile-app.md`. Do not add TypeScript-only syntax.

If `eas.json` uses `"cli": { "appVersionSource": "remote" }`, `ios.buildNumber` in app config may be ignored for upload numbering, but update it to match the release artifact when doing a one-off fix so source and shipped build do not drift.

## Phase D - Expo Router Routes

Create mobile routes for the literal web paths iOS will pass into the app. Route groups are not part of the incoming web URL.

Example:

```text
mobile-app/app/auth/signin.tsx
mobile-app/app/app/items/[itemId].tsx
mobile-app/app/go/[shortId].tsx
```

For an auth callback link such as:

```text
https://example.com/auth/signin?callbackUrl=%2Fapp%2Fitems%2F123
```

`mobile-app/app/auth/signin.tsx` should:

1. Read `callbackUrl` and `returnTo` from `useLocalSearchParams`.
2. Resolve them through a safe helper.
3. If authenticated, redirect to the native target.
4. If signed out, redirect to the auth screen with a sanitized native `returnTo`.

The signed-in auth screen must use the same helper after successful OTP/password/social auth:

```ts
const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
const authReturnTo = useMemo(() => resolveMobileReturnTo(returnTo), [returnTo]);

// after auth state becomes authenticated:
router.replace(authReturnTo.href);

// social auth callback:
callbackURL: authReturnTo.path;
```

## Phase E - Safe Return Resolver

Add a small resolver, usually `mobile-app/lib/deep-links.ts`.

Required behavior:

- Accept only trusted web origins and known native paths.
- Support nested `/auth/signin?callbackUrl=...` and `/auth/signin?returnTo=...`.
- Map web detail paths to native route objects, e.g. `{ pathname: "/(app)/item/[itemId]", params: { itemId } }`.
- Use route group segments for native app routes.
- Reject external origins, protocol tricks, `//evil.com`, backslashes, control characters, `javascript:`, malformed percent encoding, and excessive nesting.
- Return a stable home fallback for unsupported paths.

Keep the helper framework-agnostic enough to unit test without rendering React.

## Phase F - Tests

Add focused tests that encode the incident URL and the safety cases:

```text
- AASA components exactly include the intended auth/detail/shortlink paths.
- The reported URL maps to the intended native detail route.
- Direct detail web paths map to native detail.
- Already-native returnTo paths are preserved.
- Unsupported auth paths fall back.
- External, unsafe, malformed, or too-deep values fall back.
```

Run the narrow checks first:

```bash
npm run test:ci -- <deeplink-test-file>
cd mobile-app && npx tsc --noEmit
cd web-app && npm run typecheck
cd web-app && npm run build
```

Run broader lint/build only when the touched surface justifies it or before release.

## Phase G - Build, Inspect, Upload

For a TestFlight-only bug, code changes are not enough. The installed app must update so iOS refreshes Associated Domains and the app has the new Expo routes.

If the repo is dirty, create an isolated worktree from the release baseline:

```bash
tmpdir="/tmp/ns-ios-deeplink-$(date +%Y%m%d%H%M%S)"
git worktree add "$tmpdir" HEAD
```

Apply only the deeplink patch, copy ignored signing files when using a macOS local build, and detect the OS before building:

```bash
uname -s || node -p "process.platform"
```

- **macOS / Darwin**: build locally by default:

```bash
cd "$tmpdir/mobile-app"
npx tsc --noEmit
npx eas-cli@latest build --platform ios --profile production \
  --local --non-interactive --output /tmp/{slug}-deeplink.ipa
```

- **Windows/Linux**: do not attempt a local iOS build. Load/follow `.agents/skills/ns-setup-expo/SKILL.md`, verify `eas-cli`, `eas whoami`, linked `easProjectId`, and `expo-doctor`, then run an EAS cloud build and download the `.ipa` artifact:

```bash
cd "$tmpdir/mobile-app"
npx tsc --noEmit
npx eas-cli@latest build --platform ios --profile production --non-interactive --no-wait
```

Inspect the IPA before upload:

```bash
inspect_dir="/tmp/ipa-inspect-$(date +%Y%m%d%H%M%S)"
mkdir -p "$inspect_dir"
unzip -q /tmp/{slug}-deeplink.ipa -d "$inspect_dir"

/usr/bin/codesign -d --entitlements :- "$inspect_dir/Payload/{AppName}.app" 2>/dev/null | plutil -p -
plutil -p "$inspect_dir/Payload/{AppName}.app/Info.plist" | egrep 'CFBundleIdentifier|CFBundleShortVersionString|CFBundleVersion|CFBundleURLTypes'

export LC_ALL=C
grep -a -q '/auth/signin' "$inspect_dir/Payload/{AppName}.app/main.jsbundle" && echo auth-route-present
grep -a -q 'callbackUrl' "$inspect_dir/Payload/{AppName}.app/main.jsbundle" && echo callback-present
```

Expected entitlements:

```text
application-identifier = TEAMID.bundle.id
com.apple.developer.associated-domains = ["applinks:example.com", ...]
get-task-allow = false
```

Resolve App Store Connect state:

```bash
asc auth status --validate
asc apps list | grep -i "<app name or bundle id>"
asc builds list --app "{asc_app_id}" --limit 5 --processing-state all
asc testflight groups list --app "{asc_app_id}"
```

Upload and wait:

```bash
asc publish testflight --app "{asc_app_id}" --ipa /tmp/{slug}-deeplink.ipa \
  --build-number "{build_number}" \
  --group "{internal_group_id}" \
  --test-notes "Fix iOS Universal Links and auth callback deeplinks." \
  --locale en-US \
  --wait --timeout 60m --output json
```

If the internal group has `hasAccessToAllBuilds: true`, `asc` may say it skipped attaching the group because it already receives all builds. That is not a failure.

Verify final ASC state:

```bash
asc status --app "{asc_app_id}"
asc builds list --app "{asc_app_id}" --limit 3 --processing-state all
```

Report the version, build number, build ID, processing state, and group behavior.

## Phase H - Simulator Runtime Proof

Use `/ns-ios-verification` for standard simulator flows. For deeplinks, run:

```bash
xcrun simctl openurl "$UDID" "{scheme}://auth/signin?callbackUrl=%2Fapp%2Fitems%2F123"
xcrun simctl io "$UDID" screenshot /tmp/deeplink-scheme.png
```

This proves the mobile resolver/routes when the scheme link reaches the app.

For HTTPS Universal Links:

```bash
xcrun simctl openurl "$UDID" "https://$domain/auth/signin?callbackUrl=%2Fapp%2Fitems%2F123"
xcrun simctl io "$UDID" screenshot /tmp/deeplink-universal.png
```

If this opens Safari, inspect the installed simulator app before declaring failure:

```bash
app_path=$(xcrun simctl listapps "$UDID" | awk -F'= ' '/Bundle =/ {gsub(/[\";]/,"",$2); sub(/^file:\/\//,"",$2); print $2; exit}')
/usr/bin/codesign -d --entitlements :- "$app_path" 2>/dev/null | plutil -p -
```

Common simulator caveat: an old simulator dev build may have no entitlements, or it may have been installed before the AASA file existed. In that case, Safari is expected and not a valid TestFlight failure. Rebuild/reinstall a dev build with Associated Domains after the live AASA is correct, or rely on the inspected TestFlight IPA + Apple CDN + ASC `VALID` state.

## Done Criteria

You are done only when you can state all of these:

- The live AASA URL returns `200` with `application/json`.
- Apple's AASA CDN returns the same app ID/path rules.
- The failing URL itself returns a real web response.
- Mobile has literal web-path routes and a safe `returnTo` resolver.
- Tests cover the reported URL and unsafe callback cases.
- Mobile typecheck passes.
- Web route/type/build checks pass for the changed web surface.
- The IPA has the Associated Domains entitlement and the deeplink route code in its bundle.
- The new TestFlight build is `VALID` in App Store Connect, or the exact external blocker is documented.
- Any simulator result is interpreted with entitlements/cache caveats, not treated as proof by assumption.

End with the next user action when relevant: install/update to the new TestFlight build; if an old install keeps Safari behavior, delete/reinstall once to force iOS to refresh associated-domain state.
