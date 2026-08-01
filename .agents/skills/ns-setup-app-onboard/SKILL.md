---
name: ns-setup-app-onboard
description: Design or improve the in-product NowStack Mobile onboarding and activation journey through focused discovery, implementation planning, and real mobile verification. Distinct from first-clone `ns-onboard`.
---

# Setup App Onboarding - NowStack Mobile

<boundary>
`ns-onboard` configures a fresh repository and developer environment. This skill owns the end-user journey from first launch to the first meaningful product outcome.
</boundary>

<discovery>
Before editing, establish: target user, promised outcome, activation event, minimum information required before activation, permission timing, auth timing, paywall timing, skip/back behavior, returning-user behavior, and how progress persists across cold relaunch. Inspect the current route tree, onboarding content, auth store, payment entrypoint, and analytics helper.
</discovery>

<principles>
- Every screen earns its place; prefer fewer decisions and earlier product value.
- Ask permissions in context, never as a first-launch wall without value explanation.
- Auth/paywall position follows product risk and value, not template inertia.
- Preserve resumability, accessibility, safe-area/keyboard behavior, reduced motion, and small-screen layouts.
- Analytics events describe intent/outcome without raw email, free text, tokens, or sensitive content.
</principles>

<workflow>
1. Map the current funnel and measurable activation event.
2. Propose the smallest screen/state change with keep/change rationale; get product direction before a material redesign.
3. Follow `.agents/rules/mobile-app.md`, `building-native-ui`, and `vercel-react-native-skills` where applicable.
4. Implement through existing theme/UI primitives and auth/payment owners; do not create a parallel state machine.
5. Verify fresh account, interrupted/resumed onboarding, existing account, cold relaunch, keyboard, accessibility, and both iOS/Android when behavior is shared.
6. Report activation instrumentation and any platform result that remains `NOT VERIFIABLE`.
</workflow>
