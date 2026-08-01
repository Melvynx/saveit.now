---
name: ns-setup-google-auth
description: Set up and verify Google OAuth for NowStack Mobile web and Expo clients against the shared Better Auth and Convex backend. Use for Google sign-in buttons, Google Cloud OAuth clients, callback URLs, missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET, or production Google auth rotation.
argument-hint: "[--prod]"
---

# Setup Google Auth - NowStack Mobile

<objective>
Create a deployment-specific Google OAuth Web client, store its credentials only in the matching Convex deployment, and prove that both web and mobile discover the provider through `api.auth.getEnabledAuthProviders`.
</objective>

<arguments>
- Default: configure the current Convex development deployment.
- `--prod`: create a dedicated production OAuth client and write values with `npx convex env set --prod`. Never copy development OAuth credentials into production.
</arguments>

<read_first>
Read the auth feature flag and the real provider implementation before changing anything:

```bash
rg -n "enableGoogleSignIn|GOOGLE_CLIENT|google|getEnabledAuthProviders|CONVEX_SITE" \
  site-config.ts convex mobile-app web-app scripts
npx convex env list | sed 's/=.*$/=<set>/'
npx convex run auth:getEnabledAuthProviders '{}'
```

For `--prod`, also run:

```bash
npx convex env list --prod | sed 's/=.*$/=<set>/'
npx convex run --prod auth:getEnabledAuthProviders '{}'
```

Derive `{convex_site_host}` from the target deployment's `.convex.site` URL. The callback is always:

```text
https://{convex_site_host}/api/auth/callback/google
```
</read_first>

<workflow>
1. Confirm `SiteConfig.features.enableGoogleSignIn` is enabled and Google is wired in `convex/auth.ts` plus the provider-availability query. Do not render a client button from the flag alone.
2. Use the user's authenticated Google Cloud session. Prefer `gcloud` for inspection and Chrome for Google Auth Platform steps that have no reliable CLI equivalent.
3. Select or create a dedicated Google Cloud project named from the product. Do not reuse an unrelated company project. In `--prod` mode, create a distinct production OAuth client even when the project is shared.
4. Configure Google Auth Platform branding: product name, support email, contact email, external audience when appropriate, required policy acceptance, and the real privacy/terms URLs for production. Stop only for human-only consent, 2FA, or policy gates.
5. Create an OAuth 2.0 Client ID of type **Web application**. Use an unmistakable name such as `{app} development` or `{app} production` and register the exact callback URL above.
6. If the current Google UI does not reveal the original secret, open the client detail and choose **Add secret**. Capture the new secret once and never put it in chat, logs, screenshots, or git-tracked files.
7. Set the target Convex environment. `SITE_URL` is the browser origin, not the Convex site URL:

```bash
# development
npx convex env set SITE_URL "http://localhost:3111"
npx convex env set GOOGLE_CLIENT_ID "<client>.apps.googleusercontent.com"
pbpaste | npx convex env set GOOGLE_CLIENT_SECRET

# production (--prod)
npx convex env set --prod SITE_URL "https://<production-app-domain>"
npx convex env set --prod GOOGLE_CLIENT_ID "<production-client>.apps.googleusercontent.com"
pbpaste | npx convex env set --prod GOOGLE_CLIENT_SECRET
```

On non-macOS systems, use the platform clipboard equivalent or pipe a protected runtime variable to the same value-less `convex env set` command. Never put the secret literal in the command line.

8. Do not write these values to `.env`, `.env.local`, `site-config.ts`, docs, shell history, or build config.
</workflow>

<verification>
Verify without printing secret values:

```bash
# development
npx convex run auth:getEnabledAuthProviders '{}'

# production
npx convex run --prod auth:getEnabledAuthProviders '{}'
```

The result must report `google: true`. Then:

1. Open the signed-out web sign-in route with the repo's browser-verification workflow.
2. Confirm the Google button is visible.
3. Click it and confirm the redirect reaches `accounts.google.com`, uses the expected client ID, and carries the exact target Convex callback.
4. On mobile, reload the Expo app against the same target Convex deployment and confirm the Google button appears. Exercise the redirect/deep-link return when the environment supports it.

If the button is absent, check the feature flag, target deployment, both Convex env values, and query result before changing UI code.
</verification>

<production_invariant>
A production deployment is blocked until a production-specific Google OAuth client exists, its production callback is registered, its fresh client secret is stored with `--prod`, and the production provider query returns `google: true`. Development credentials are not a production shortcut.
</production_invariant>

<success_criteria>
- Correct deployment-specific callback registered in Google Cloud.
- Client ID and secret exist only in the matching Convex environment.
- Provider query reports Google enabled on the target deployment.
- Web redirect and mobile provider visibility are verified.
- Production never reuses the development OAuth client secret.
</success_criteria>
