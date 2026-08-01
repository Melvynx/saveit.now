---
name: ns-launch-audit
description: Perform a read-only NowStack Mobile launch audit across product, web, iOS, Android, backend, auth, payments, email, storage, analytics, stores, and operations. Returns an evidence-backed GO or NO-GO verdict.
---

# Launch Audit - NowStack Mobile

<objective>
Issue a fail-closed launch verdict without editing code, installing tools, deploying, uploading, submitting, or changing provider state.
</objective>

<audit_matrix>
1. Product/config: placeholders, legal/support URLs, shared config mirrors, version ownership.
2. Backend: Convex compile, schema/index/auth boundaries, production env verifiability.
3. Web: production build, SSR routes, auth gates, legal pages, `/app`, `/admin`.
4. iOS: run `ns-ios-audit`; verify exact TestFlight build and App Review readiness.
5. Android: verify exact internal build, package/account/track, listing and compliance readiness.
6. Auth: provider parity, production-specific OAuth, private reviewer credentials, account deletion.
7. Money/data: Apple IAP, Stripe live objects/webhook, R2 target/public exposure, email delivery.
8. Analytics/privacy: consent, PII policy, dev/prod separation, store declarations.
9. Operations: release rollback/monitoring/support ownership and credential rotation.
</audit_matrix>

<evidence>
Run `ns-check-setup` in development, accounts, and production modes. Use `ns-verify --read-only` for existing runtimes; never invoke `npx convex dev --once` from this audit. Read provider state only when credentials are already available. Mark inaccessible state `NOT VERIFIABLE`.
</evidence>

<verdict>
`GO` requires zero blockers and zero required unknowns. Output blockers, warnings, manual gates, verified strengths, and the shortest ordered remediation path with owner skills. Never repair findings inside this read-only skill.
</verdict>
