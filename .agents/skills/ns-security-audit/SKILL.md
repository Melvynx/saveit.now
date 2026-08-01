---
name: ns-security-audit
description: Audit and remediate NowStack Mobile security flaws. Use for auth/session abuse, Apple or Stripe payment bypass, Convex authorization, cross-user data leaks, unsafe deep links, R2 uploads, client secrets, SSRF, XSS, or pentest follow-up.
---

# NS Security Audit

Find exploitable trust-boundary failures across the Expo app, TanStack web app,
and Convex backend, repair confirmed issues at their shared enforcement point,
and prove the repair without creating new operational risk.

## Choose the Operating Mode

Infer the narrowest mode from the request:

- `audit`: inspect and report only; do not edit.
- `audit and fix`, `remediate`, or `find and fix`: inspect, implement the
  smallest complete repairs, add regression coverage, and verify locally.
- `production verification`: perform only explicitly authorized, low-impact
  read-only checks. Source-repository access never implies authorization to
  attack a deployed app, API, or provider account.

Treat authorization to edit this repository as authorization for local source
changes and local tests only. It does not authorize deploys, provider changes,
production writes, account creation, emails, payments, builds, store uploads,
or destructive actions.

## Hard Safety Boundaries

These rules override convenience and test completeness:

1. Never create or use a temporary, disposable, catch-all, generated, or
   agent-controlled email inbox or alias. Never invoke an AgentMail skill,
   tool, API, or CLI.
2. Never register an account with a third party's, employee's, founder's,
   published, guessed, or unverified email address. Never test pre-hijacking or
   account enumeration against real people.
3. Never trigger repeated signup, OTP, invitation, verification, or password
   reset emails. Do not brute-force, spray credentials, fuzz at volume, load
   test, race production requests, replay live tokens, or attempt takeover.
4. Never complete a real or test payment against production, validate a live
   store receipt by mutation, issue refunds, activate entitlements, create
   provider resources, or cross a confirmation boundary without explicit
   approval for that exact mutation.
5. Never print, copy, commit, or report secrets, session cookies, refresh
   tokens, store receipts, API keys, full personal data, or raw production rows.
   Redact evidence.
6. Never mutate or delete production data. Do not use destructive shell or Git
   commands. Preserve unrelated worktree changes.

For authenticated local verification, reuse the owner-provided account named by
the repository verification rules. Follow `ns-ios-verification` for Simulator
proof. If safe proof requires a forbidden action, report `NOT VERIFIABLE` and
state the missing evidence.

## Load the Required Context

1. Read `AGENTS.md` and every matching `.agents/rules/*` file before planning
   edits. Any Convex work also requires
   `convex/_generated/ai/guidelines.md` in full.
2. Read [references/audit-controls.md](references/audit-controls.md) for the
   mobile control matrix. Read
   [references/evidence-and-reporting.md](references/evidence-and-reporting.md)
   before assigning severity or writing the final report.
3. Inspect `git status --short`, package/runtime constraints, existing tests,
   and recent security-related changelog entries.
4. Run `bash .agents/skills/ns-security-audit/scripts/security-audit-scan.sh .`
   for candidate files. The scanner reports paths only and never confirms a
   vulnerability; inspect every candidate manually.

## Audit Workflow

### 1. Map Trust Boundaries

Map Expo routes and native modules, TanStack public/auth/admin routes, Convex
public/internal functions, Better Auth endpoints and token storage, Apple IAP,
Stripe actions and webhooks, R2 uploads, deep/universal links, push tokens,
background jobs, and client-visible DTOs. Identify the server-side authority
for identity, role, entitlement, price, payment state, limits, and ownership.

### 2. Trace High-Risk Invariants End to End

Start with these chains before low-severity headers:

1. Apple/Google/Stripe proof -> provider verification and environment -> stable
   user -> server-priced purchase -> idempotent entitlement;
2. app session -> verified identity -> role -> object ownership -> minimal DTO;
3. public client config -> bundle boundary -> server-only Convex secrets;
4. deep/universal link -> trusted scheme/host -> validated route and callback;
5. upload request -> user ownership -> size/type/content validation -> safe
   object key -> isolated serving origin;
6. user URL or webhook target -> scheme/host/IP validation -> bounded fetch with
   redirect revalidation and timeout.

Do not trust client-provided user IDs, role, plan, product ID, price, paid state,
receipt status, Stripe mode, redirect URL, MIME type, or object key. A native
binary is an untrusted public client, even when distributed through a store.

### 3. Confirm Findings

Prefer source proof plus focused automated tests. A suspicious pattern is a
`CANDIDATE`, not a finding. Confirm the reachable entrypoint, attacker control,
missing server-side guard, impact, and absence of a compensating control.

Use a second user only in local or isolated test state with project-owned
fixtures. Never create external accounts or inboxes to obtain proof. Record
secure negative checks separately so they are not later reported as bugs.

### 4. Remediate at the Choke Point

When fixing is authorized:

- enforce auth, role, ownership, entitlement, and payment state in shared
  server/Convex builders or domain services;
- verify store receipts and Stripe events server-side, bind them to canonical
  products/users/environments, and make entitlement writes idempotent;
- keep secrets out of Expo public config, bundles, logs, DTOs, and persisted
  client state; store only the minimum session material in secure storage;
- validate deep-link origins and callback destinations at both native and
  server boundaries;
- move provider-only writes to internal functions and project minimal DTOs;
- use strict input schemas, explicit transition allowlists, and atomic quotas;
- fail closed with generic client errors and detailed server-only logs;
- add a regression test for the exploit path and a neighboring valid path.

Fix the exploit chain, not only the first observed endpoint. Search for sibling
call sites that rely on the same broken assumption. Keep unrelated findings and
unrelated worktree changes separate.

### 5. Verify Proportionally

Run the narrowest relevant checks first, then repository gates from
`.agents/rules/development-commands.md`. For Convex changes, run the required
codegen/check path. For web behavior, use `dev-browser`; for native behavior,
follow `ns-ios-verification` and use `xcrun simctl`.

Do not start, stop, restart, deploy, build for stores, or change an existing
runtime unless the request and repository rules authorize it. Never treat green
local tests as production proof.

### 6. Update Project Records

After code or skill changes, update `CHANGELOG.md`. Do not commit, push, deploy,
or open a pull request unless explicitly requested.

## Output Contract

Lead with the security verdict and whether fixes were made. For each item give:

- severity and status: `CONFIRMED`, `FIXED`, `CANDIDATE`, `NOT REPRODUCED`, or
  `NOT VERIFIABLE`;
- affected boundary and concise impact;
- redacted evidence with file/line or test reference;
- root cause and complete remediation;
- verification level: static, automated, local runtime, staging, or production.

End with residual risks and skipped checks. Never include reusable exploit
payloads, live identifiers, tokens, receipts, personal data, or instructions
that would enable abuse of an external target.
