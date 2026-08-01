# Mobile Security Audit Controls

Audit in this order: payment and entitlement integrity; authorization and data
exposure; client/server secret boundaries; auth and session lifecycle; native
links and platform integrations; uploads and outbound requests; web hardening.

## Payments And Entitlements

- Treat Apple, Google, and Stripe purchase state from the client as untrusted.
- Verify receipts or signed transaction data server-side with the correct
  provider and environment. Bind product IDs to a server-owned entitlement map.
- Reject sandbox/test Stripe evidence in production and reject production
  evidence in isolated test flows when the provider supports that distinction.
- Bind transactions to the canonical user and make grants idempotent. Handle
  renewals, refunds, revocations, expiration, and account-transfer policy.
- Never grant access from a success screen, callback, locally persisted flag,
  product ID, price, or client-reported purchase result.
- Enforce plan quotas atomically in Convex on every write path, not only in UI.

## Authorization And Data Exposure

- Inventory every public Convex function and HTTP route. Public function names
  are not authorization boundaries.
- Require auth, then role and object ownership as appropriate. Load client IDs
  through ownership-scoped indexes or validate ownership before read/write.
- Use strict operation-specific validators. Never accept privileged generic
  patches for role, owner, plan, entitlement, verification, or payment state.
- Return purpose-built DTOs. Exclude tokens, receipts, provider IDs, secrets,
  internal notes, storage paths, full auth rows, and unnecessary personal data.
- Keep admin authorization server-side. Hiding an Expo or web route is not an
  access control.

## Public Client And Secret Boundary

- Treat all Expo `EXPO_PUBLIC_*`, app config, embedded assets, source maps, OTA
  updates, web bundles, and shipped native code as publicly readable.
- Keep Better Auth, Stripe secret, Apple/Google verification, R2, Resend, and
  admin credentials in Convex or the owning provider only.
- Do not log session tokens, refresh tokens, OTPs, receipts, push tokens, email
  addresses, or raw provider responses in client or production logs.
- Ensure environment selection cannot be changed by untrusted client input.
- Review EAS update channels and runtime-version policy so production devices
  cannot accept an unintended development update.

## Authentication And Session Lifecycle

- Store only required session material using platform secure storage; do not
  persist bearer tokens in AsyncStorage, URLs, analytics, or crash reports.
- Validate redirect/callback origins server-side and configure exact trusted
  origins for web, custom schemes, Universal Links, and App Links.
- Require verified identity for privileged actions and bind records to stable
  user IDs rather than email addresses.
- Rate-limit OTP send/verify, password reset, device registration, push-token
  registration, and public writes using trusted network/account signals.
- Make recovery and verification tokens short-lived, single-use, and revoked
  after successful use. Revoke sessions after sensitive identity changes.
- Avoid useful account-enumeration responses and pair generic responses with
  rate limiting.

## Native Links, WebViews, And Platform APIs

- Allowlist deep-link schemes, hosts, and routes; validate nested redirect URLs
  and reject privileged actions triggered only by navigation.
- Verify iOS Associated Domains/AASA and Android intent filters/asset links do
  not claim overly broad domains or export unsafe activities.
- Avoid WebViews for sensitive flows. When necessary, restrict origins,
  navigation, file access, injected JavaScript, and native bridges.
- Validate push payload data before navigation or mutation. A push notification
  is attacker-influenced input, not proof of authorization.
- Request minimum device permissions and avoid exposing sensitive values via
  clipboard, screenshots, backups, or notification previews.

## Uploads, Rendering, And Outbound Requests

- Authorize upload creation and scope object keys to the user server-side.
- Limit size and allowed media types; verify content instead of trusting the
  filename or declared MIME. Prevent overwrite and path traversal.
- Serve untrusted content from a separate non-cookie origin with `nosniff` and
  never execute uploaded HTML/SVG under a trusted app origin.
- Treat URLs, webhook targets, previews, imports, and callbacks as SSRF inputs.
  Revalidate DNS and redirects; reject private/reserved addresses; bound time,
  redirects, and response size.

## Web And API Defense In Depth

- Restrict credentialed CORS to explicit origins; never reflect arbitrary
  origins with credentials.
- Apply CSP, `frame-ancestors`, `nosniff`, `Referrer-Policy`, and an appropriate
  `Permissions-Policy` to the web app.
- Sanitize attacker-controlled HTML/Markdown and validate URL schemes.
- Return stable client-safe errors; keep stack traces and provider details in
  server-only logs.

## Abuse Review Without Live Abuse

Use source analysis and isolated tests instead of production spraying for OTP
bombing, free-trial churn, receipt replay, entitlement races, push-token abuse,
upload/storage cost amplification, analytics poisoning, and public AI/media
generation. Report unsafe production-only proof as `NOT VERIFIABLE`.
