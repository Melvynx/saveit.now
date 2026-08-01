---
name: ns-check-setup
description: Run the NowStack Mobile setup checker as a strict read-only contract. Use for `/ns check`, configuration readiness, external account status, production preflight, or machine-readable setup evidence.
---

# Check Setup - NowStack Mobile

<objective>
Return a deterministic readiness result without changing files, deployments, accounts, or running services.
</objective>

<commands>
```bash
node scripts/check-setup.mjs --json
node scripts/check-setup.mjs --accounts --json
node scripts/check-setup.mjs --prod --json
```

- Default: local files plus the current development Convex deployment.
- `--accounts`: external CLI/auth/account probes only.
- `--prod`: fail-closed production deployment validation; it may not be combined with `--skip-convex`.
- `--skip-convex`: explicitly offline development-only evidence.
</commands>

<rules>
- Read-only means no installs, logins, env writes, service starts, deployment, or browser mutations.
- Exit `0` means no blocking error; warnings remain visible in JSON.
- Exit `1` means blocked/non-ready; exit `2` means invalid invocation.
- Unknown or inaccessible production state is `NOT VERIFIABLE` and blocks production.
- Never print secret values from Convex, EAS, Vercel, ASC, Stripe, Cloudflare, or Google credentials.
</rules>

<report>
Summarize mode, error/warning counts, each non-ready item with evidence, and one exact next owner skill. Do not turn optional skipped surfaces into blockers unless the user's target needs them.
</report>
