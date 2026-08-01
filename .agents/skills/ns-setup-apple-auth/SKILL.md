---
name: ns-setup-apple-auth
description: Set up and verify Sign in with Apple for NowStack Mobile web and iOS against the shared Better Auth and Convex backend. Use for Apple Services IDs, return URLs, Sign in with Apple keys, APPLE_CLIENT_ID or APPLE_CLIENT_SECRET, expiring Apple JWTs, or production Apple auth rotation.
argument-hint: "[--prod]"
---

# Setup Apple Auth - NowStack Mobile

<objective>
Create the Apple Services ID and Sign in with Apple key required by Better Auth, generate a standards-compliant client-secret JWT, store it only in the matching Convex deployment, and verify web plus iOS provider availability.
</objective>

<arguments>
- Default: configure the current Convex development deployment.
- `--prod`: create or verify a dedicated production Services ID/return URL and generate a fresh production client-secret JWT. Never copy a development Services ID or old JWT into production.
</arguments>

<critical_distinction>
`APPLE_CLIENT_ID` is the Apple **Services ID** used by the web OAuth flow, normally `{bundle_id}.web`. It is not the native app bundle ID. The native App ID remains the Services ID's primary App ID.
</critical_distinction>

<read_first>
```bash
rg -n "enableAppleSignIn|APPLE_CLIENT|apple|getEnabledAuthProviders|bundleId|appleTeamId|CONVEX_SITE" \
  site-config.ts convex mobile-app web-app scripts
npx convex env list | sed 's/=.*$/=<set>/'
npx convex run auth:getEnabledAuthProviders '{}'
```

For `--prod`, inspect the production deployment too:

```bash
npx convex env list --prod | sed 's/=.*$/=<set>/'
npx convex run --prod auth:getEnabledAuthProviders '{}'
```

Derive:
- `{bundle_id}` and `{team_id}` from `site-config.ts`.
- `{services_id}` as `{bundle_id}.web` for development. For `--prod`, use an existing production-only Services ID or create `{bundle_id}.web.prod`.
- `{convex_site_host}` from the target deployment's `.convex.site` URL.
- Return URL: `https://{convex_site_host}/api/auth/callback/apple`.
- Domain: `{convex_site_host}` with no scheme and no path.
</read_first>

<workflow>
1. Confirm `SiteConfig.features.enableAppleSignIn` is enabled and Apple is wired in `convex/auth.ts` plus the provider-availability query. Apple remains iOS-only on native clients but is available on the web.
2. Use the user's authenticated Apple Developer session. Stop only for Apple login, 2FA, agreements, or other human-only gates.
3. In Certificates, Identifiers & Profiles, create or open the Services ID `{services_id}`. Enable **Sign in with Apple**. In `--prod`, it must be a production-only Services ID; do not reuse the development identifier.
4. Configure its primary App ID as the existing native App ID for `{bundle_id}`. Register the target domain and exact return URL above, then save both the configuration and the Services ID.
5. Create a dedicated **Sign in with Apple** key and associate it with the same primary App ID. Creating a new key mutates the Apple account and requires user confirmation. Download `AuthKey_{key_id}.p8` once to a secure directory outside the repo; never rename it into or copy it under the repository.
6. Generate and install the client-secret with the repo script:

```bash
# development
node scripts/generate-apple-client-secret.mjs \
  --team-id "<team-id>" \
  --client-id "<services-id>" \
  --key-id "<key-id>" \
  --private-key "/secure/path/AuthKey_<key-id>.p8"

# production
node scripts/generate-apple-client-secret.mjs --prod \
  --team-id "<team-id>" \
  --client-id "<production-services-id>" \
  --key-id "<key-id>" \
  --private-key "/secure/path/AuthKey_<key-id>.p8"
```

Add `--dry-run` first to validate signing and expiry without changing Convex, then rerun without it to install the credentials.

The script never prints the JWT. It generates an ES256 token with:
   - header: `alg=ES256`, `kid={key_id}`, `typ=JWT`;
   - claims: `iss={team_id}`, current `iat`, `exp` no more than six months after `iat`, `aud=https://appleid.apple.com`, `sub={services_id}`;
   - the `.p8` private key and a JOSE-compatible 64-byte IEEE-P1363 signature.
7. The script validates required claims, the 64-byte signature, and a lifetime of at most 180 days, then stores `APPLE_CLIENT_ID` and `APPLE_CLIENT_SECRET` directly in the selected Convex deployment. Record the reported expiry in the handoff.
8. Set `SITE_URL` separately because it is the web origin rather than an Apple credential:

```bash
# development
npx convex env set SITE_URL "http://localhost:3111"

# production (--prod)
npx convex env set --prod SITE_URL "https://<production-app-domain>"
```

Do not print the JWT, `.p8` contents, or private-key path in public output. Do not commit any of them.
</workflow>

<jwt_rotation>
Apple client-secret JWTs expire. Every production preflight must decode the current JWT expiry without logging the token and generate a fresh JWT when it is missing, expired, close to expiry, or when entering production for the first time. Default to rotating before a production release rather than copying a development value.
</jwt_rotation>

<verification>
```bash
# development
npx convex run auth:getEnabledAuthProviders '{}'

# production
npx convex run --prod auth:getEnabledAuthProviders '{}'
```

The result must report `apple: true`. Then:

1. Open the signed-out web sign-in route using the repo's browser-verification workflow.
2. Confirm the Apple button is visible and redirects to `appleid.apple.com` with `{services_id}` and the exact target return URL.
3. Reload the iOS development build against the same Convex deployment and confirm the native Apple button appears.
4. Complete a sign-in when possible and verify the session returns to the intended callback URL.

If Apple reports `invalid_client`, check Services ID versus bundle ID, key association, Team ID, JWT signature format, clock skew, and expiry before changing application code.
</verification>

<production_invariant>
A production deployment is blocked until the production domain/return URL is registered, `APPLE_CLIENT_ID` is the Services ID, a fresh valid JWT is stored with `--prod`, and the production provider query returns `apple: true`.
</production_invariant>

<success_criteria>
- Services ID points to the correct primary App ID and target callback.
- `.p8` remains outside the repository and is never printed.
- Fresh JWT claims and expiry are verified locally.
- Apple credentials exist only in the matching Convex deployment.
- Web redirect and iOS provider visibility are verified.
</success_criteria>
