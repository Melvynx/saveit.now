---
name: ns-setup-r2
description: Set up Cloudflare R2 image/file uploads for NowStack Mobile - create the bucket, get S3 credentials, set the R2_* env vars on the Convex deployment, and verify. Use for "set up image uploads", "configure R2", "Cloudflare storage", "enable file uploads", or "file uploads not working".
---

# Setup Cloudflare R2 - NowStack Mobile

Wire Cloudflare R2 so the boilerplate's image/file uploads work. The backend is already built — `convex/storage/r2.ts` issues presigned PUT URLs (`getUploadUrl`) and reads/writes via the S3-compatible API. This skill provisions the bucket + credentials and sets the five `R2_*` env vars **on the Convex deployment** (the action runtime reads them — they do NOT go in `web-app`/`mobile-app` `.env`). For deep Cloudflare platform help, the global `cloudflare` skill covers the rest of R2/Workers/etc.

<what_the_backend_expects>
`convex/storage/r2.ts` reads exactly these (set on the Convex deployment, dev AND prod):

| Var | Value |
| --- | --- |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` (S3 API endpoint) |
| `R2_ACCESS_KEY_ID` | from an R2 API token (S3 credentials) |
| `R2_SECRET_ACCESS_KEY` | from the same token (shown once) |
| `R2_BUCKET_NAME` | your bucket name |
| `R2_PUBLIC_URL` | public base URL for reads — `https://<custom-domain>` or the bucket's `https://pub-<hash>.r2.dev` |
</what_the_backend_expects>

<automated_recommended>
**Fastest path — one script provisions everything** (creates/reuses the bucket, mints a *bucket-scoped* R2 token, derives the S3 credentials, enables the public URL, and sets all five `R2_*` on Convex). This is the same flow NowStack SaaS uses.

You need two things, then one command:

1. **Account ID** — Cloudflare dashboard → R2 (right sidebar), or any dashboard URL `dash.cloudflare.com/<account-id>/...`.
2. **A provisioning API token** — open this pre-filled link (it pre-selects the exact permission groups: R2 edit + Account API Tokens edit + Zone read + DNS edit), name it, create, copy the token:
   `https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=%5B%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_api_tokens%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%5D&name=NowStack%20R2%20Provisioning`

Then run (it reads `CLOUDFLARE_*` from flags or `.env`, never commits them):

```bash
CLOUDFLARE_ACCOUNT_ID=<id> CLOUDFLARE_API_TOKEN=<token> \
  node .agents/skills/ns-setup-r2/scripts/setup-cloudflare-r2.mjs --bucket <app-slug>-storage
```

It's idempotent (reuses an existing bucket/token), auto-attaches a custom domain if your `site-config.ts` domain has a Cloudflare zone, else enables the managed `r2.dev` URL. Re-run with `--help` for options (`--public-url`, `--jurisdiction`, `--skip-public-url`). For **prod**, set the same five vars with `npx convex env set --prod …` (the script targets the current dev deployment). Then `npm run check-setup`.

If the script can't run (no provisioning token, or you prefer clicking), use the manual steps below.
</automated_recommended>

<step n="1" title="Create the bucket">
With wrangler (install if missing: `npm i -g wrangler`, then `wrangler login`):

```bash
wrangler r2 bucket create <app-slug>-storage
```

Or in the dashboard: Cloudflare → R2 → Create bucket. Note the bucket name → `R2_BUCKET_NAME`.
</step>

<step n="2" title="Get S3 credentials (R2 API token) — manual, shown once">
R2 S3 access keys are minted in the dashboard (wrangler cannot create them):
Cloudflare → R2 → **Manage R2 API Tokens** → Create API token → permission **Object Read & Write**, scoped to the bucket (or all buckets). On create it shows:
- **Access Key ID** → `R2_ACCESS_KEY_ID`
- **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (copy now — never shown again)
- **S3 endpoint** `https://<account-id>.r2.cloudflarestorage.com` → `R2_ENDPOINT`

Never commit or print these.
</step>

<step n="3" title="Public read URL">
R2 buckets are private by default; `R2_PUBLIC_URL` is the base for serving files. Two options:
- **Custom domain (recommended for prod):** bucket → Settings → Public access → Connect Domain (e.g. `cdn.yourdomain.com`). `R2_PUBLIC_URL=https://cdn.yourdomain.com`.
- **Dev `r2.dev` URL:** bucket → Settings → Public access → enable r2.dev. `R2_PUBLIC_URL=https://pub-<hash>.r2.dev`.
</step>

<step n="4" title="Set the env vars on Convex (dev + prod)">
```bash
npx convex env set R2_ENDPOINT "https://<account-id>.r2.cloudflarestorage.com"
npx convex env set R2_ACCESS_KEY_ID "<access-key-id>"
npx convex env set R2_SECRET_ACCESS_KEY "<secret>"
npx convex env set R2_BUCKET_NAME "<bucket>"
npx convex env set R2_PUBLIC_URL "https://<custom-domain-or-r2.dev>"
# repeat with --prod before launch:
npx convex env set --prod R2_ENDPOINT "..."   # ...and the other four
```

Verify: `npm run check-setup` — the R2 warnings must clear.
</step>

<step n="5" title="Verify the round-trip">
From a signed-in client, call `api.storage.r2.getUploadUrl({ key, contentType })`, `PUT` the file to the returned URL, then load `${R2_PUBLIC_URL}/${key}`. Or quick backend check:

```bash
npx convex run storage/r2:internalUploadBuffer '{"key":"test/hello.txt","base64":"aGk=","contentType":"text/plain"}'
# returns the public URL; open it — if it 404s, R2_PUBLIC_URL or public access is wrong.
```
</step>

<usage>
Client upload pattern (the backend is ready; wire it into your product UI):
1. `const url = await getUploadUrl({ key, contentType })` (public `authAction`).
2. `fetch(url, { method: "PUT", body: file, headers: { "Content-Type": contentType } })`.
3. Store `key`; read at `${R2_PUBLIC_URL}/${key}` (or `internalGetDownloadUrl` for a signed URL).
Internal helpers: `internalUploadBuffer`, `internalGetDownloadUrl`, `internalDeleteObject`.
</usage>

<failure_modes>
- **Uploads 403 / SignatureDoesNotMatch** → wrong `R2_ENDPOINT` (must be the account S3 endpoint, not the public URL) or the API token lacks write on the bucket.
- **Files upload but URLs 404** → public access not enabled, or `R2_PUBLIC_URL` is wrong (it must be the public/custom-domain base, NOT the S3 endpoint).
- **Works in dev, fails in prod** → the five `R2_*` vars were not set with `--prod`.
- **CORS errors on browser PUT** → add a CORS policy to the bucket (Settings → CORS) allowing your web origin and the `PUT` method.
- **`R2_*` not set** → file features fail; `npm run check-setup` flags them as warnings (fine if you don't use uploads yet).
</failure_modes>
