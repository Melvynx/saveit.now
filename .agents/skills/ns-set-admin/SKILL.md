---
name: ns-set-admin
description: Make a user an admin in NowStack Mobile's Convex backend by email. Use for "set admin", "make me admin", "ns set-admin", "/admin access denied", "This account does not have admin access", or the infinite /admin loader.
---

# ns-set-admin — Grant admin access

<objective>
Flip `isAdmin: true` on a `users` row by email in the current Convex deployment, so `/admin` (web) stops gating the account out. This is the easy, repeatable path the boilerplate was missing — `ensureAdminUser` only self-promotes the *currently signed-in, allowlisted* caller and cannot run from the CLI, so there was no way to admin an arbitrary email.
</objective>

## How admin works here (read first)

Three gates, all must pass — this is also the loader/denial root cause:

1. **Allowlist** — email must be in BOTH `site-config.ts` (`auth.adminEmails`) and `convex/admin/auth.ts` (`ADMIN_EMAILS` constant, line ~5). They drift independently; a mismatch is the #1 cause of `/admin` problems.
2. **The `users` row** has `isAdmin === true` (schema: `convex/schema.ts`, `users.isAdmin`).
3. **Functions are deployed** to the deployment the app talks to (`npx convex dev --once`, or `--prod` for production).

Loader/denial symptoms → cause:
- **"This account does not have admin access."** → email not in `ADMIN_EMAILS` (gate 1). `ensureAdminUser` threw `Not an admin`.
- **Infinite spinner on `/admin`** → `ensureAdminUser` never resolves: functions not deployed to this deployment, or the `users` row doesn't exist yet (signed in but `ensureUser` never ran). See `web-app/app/routes/admin/route.tsx` (`adminReady`).

## Steps

### 1. Resolve the target email
Use the email the user gives. If none, default to the first entry in `site-config.ts` `auth.adminEmails`. Lowercase it — the backend compares lowercased.

### 2. Sync both allowlists
Ensure the email is present in BOTH:
- `site-config.ts` → `auth.adminEmails` (keep the `/** @type {string[]} */ ([...])` JSDoc cast wrapping — do not let Prettier strip the parens; see `.agents/rules/mobile-app.md`).
- `convex/admin/auth.ts` → `const ADMIN_EMAILS = [...]` (line ~5).

Keeping them in sync is required even when you flip `isAdmin` directly: `ensureAdminUser` re-runs on every `/admin` mount and would never *remove* admin, but other checks read the allowlist.

### 3. Ensure the CLI mutation exists (add if missing)
Add an `internalMutation` to `convex/admin/auth.ts` so admin can be granted by email from the CLI. Add `internalMutation` to the existing `_generated/server` import, then append:

```ts
// Dev/ops utility: grant admin by email from the CLI (npx convex run).
// internalMutation = not callable from any client, only the CLI/server.
export const setAdminByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const target = email.trim().toLowerCase();
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => u.email.trim().toLowerCase() === target);
    if (!user) {
      throw new Error(
        `No users row for ${target}. Sign in once on /app or /admin first so the row is created, then re-run.`,
      );
    }
    if (user.isAdmin) return { ok: true as const, alreadyAdmin: true, userId: user._id };
    await ctx.db.patch(user._id, { isAdmin: true });
    return { ok: true as const, alreadyAdmin: false, userId: user._id };
  },
});
```

The `.collect()` scan matches the existing `admin/queries.ts:listUsers` pattern and is fine for this low-frequency ops utility.

### 4. Deploy / codegen
```bash
npx convex dev --once          # local/dev deployment
# or, to target production:
npx convex dev --once && npx convex deploy
```

### 5. Run the mutation
```bash
npx convex run admin/auth:setAdminByEmail '{"email":"USER@EXAMPLE.COM"}'
# production deployment:
npx convex run --prod admin/auth:setAdminByEmail '{"email":"USER@EXAMPLE.COM"}'
```
If it throws "No users row" → the person must sign in once (web `/app` or `/admin`, or the mobile app) so `ensureUser`/`ensureAdminUser` creates the row, then re-run.

### 6. Verify
- Re-run the command — expect `alreadyAdmin: true` (idempotent).
- Reload `/admin` in the browser: the spinner should resolve to the admin shell.
- Optional check: `npx convex run users/account:internalCheckAdmin '{"tokenIdentifier":"..."}'` or inspect the `users` row in the Convex dashboard.

## Guardrails
- Run against the deployment the app actually uses. A common miss: app points at prod, you set admin in dev. Match dev vs `--prod`.
- This grants real admin. Confirm the email before running. Do not add throwaway emails to the committed allowlists.
- This is a backend access change, not a store/release action — no EAS/store steps here.

## Verification commands
```bash
npx convex dev --once          # backend compiles + deploys
cd web-app && npm run typecheck # if you touched site-config / web admin
```
