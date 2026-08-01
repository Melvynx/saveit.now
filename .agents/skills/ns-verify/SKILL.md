---
name: ns-verify
description: Verify NowStack Mobile changes across web, iOS, Android, and Convex with real runtime evidence. Use for `/ns verify`, cross-surface regression checks, acceptance proof, or release verification.
---

# Verify - NowStack Mobile

<objective>
Prove the requested behavior through the real surface and backend path. Compilation alone is not runtime proof.
</objective>

<preflight>
Read `.agents/rules/verification.md`, `.agents/rules/launch-app.md`, and the rule for every surface in scope. Check existing server/Metro reachability before starting anything; never restart a user-owned process without approval.
</preflight>

<modes>
- Default: prefer existing runtimes and provider read-backs. Starting a missing local runtime requires explicit authorization when the user did not already ask for it.
- `--read-only`: never start or restart a runtime, run code generation, deploy functions, install dependencies, or mutate local/provider state. Return `NOT VERIFIABLE` where existing evidence is insufficient.
</modes>

<routing>
- Web: use `dev-browser` against `http://localhost:3003` or the supplied deployed URL; capture navigation, interaction, URL, console/network errors, and screenshot evidence.
- iOS: delegate journey proof to `ns-ios-verification`; drive deterministic navigation with `xcrun simctl`, never computer-use. When visual/live proof helps, also run `ns-preview`: one scoped `serve-sim` mirror opened in whatever browser the agent can drive, same on every harness. Require a real-frame screenshot, not merely a reachable URL.
- Android: use the repo's emulator/ADB workflow, a dedicated emulator when work is parallel, and the exact installed build under test.
- Convex: inspect existing runtime logs, known deployments, and read-only function/provider read-backs first. `npx convex dev --once` can generate code and update the development deployment, so run it only with explicit authorization and never in `--read-only` mode.
</routing>

<minimum_matrix>
For each changed journey verify: signed-out state, happy path, relevant error/empty/loading state, signed-in state when applicable, cold relaunch/persistence for mobile, and direct/deep-link navigation. For mutations, verify backend/provider read-back rather than UI optimism.
</minimum_matrix>

<safety>
Use project-owned test data. Retrieve App Review credentials through the secret boundary without printing them. Clean temporary preview routes with `trash`. Production checks are read-only unless the user separately authorizes the exact mutation.
</safety>

<report>
Return PASS/FAIL/NOT VERIFIABLE per surface with command, runtime target, account class, observed result, artifact path, and remaining gap. Never generalize iOS proof to Android or local proof to production.
</report>
