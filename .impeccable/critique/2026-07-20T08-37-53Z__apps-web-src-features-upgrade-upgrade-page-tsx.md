---
target: apps/web/src/features/upgrade/upgrade-page.tsx
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-07-20T08-37-53Z
slug: apps-web-src-features-upgrade-upgrade-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Checkout loading is visible; completion happens in Stripe. |
| 2 | Match system and real world | 4 | The actual annual charge and monthly equivalent are explicit. |
| 3 | User control and freedom | 3 | Monthly and yearly choices are reversible before checkout. |
| 4 | Consistency and standards | 4 | Uses the existing account shell, tokens, cards, tabs, and alerts. |
| 5 | Error prevention | 3 | Annual renewal and Stripe order review are stated before payment. |
| 6 | Recognition rather than recall | 4 | Price, billing cadence, features, and trust details are co-located. |
| 7 | Flexibility and efficiency | 3 | Users can choose monthly or yearly billing directly. |
| 8 | Aesthetic and minimalist design | 4 | One purchase surface replaced the previous marketing and instruction stack. |
| 9 | Error recovery | 3 | Canceled and unavailable checkout states give plain-language recovery. |
| 10 | Help and documentation | 3 | Compact trust details cover Stripe, devices, and billing management. |
| **Total** | | **34/40** | **Good, no P0 or P1 issue remains.** |

## Anti-Patterns Verdict

Pass after the upgrade-page refactor. The previous emoji feature pitch, duplicated value labels, nested instructional card, and generic account heading were removed. The current page is restrained product UI, not a marketing page embedded inside account settings. The source detector returned zero findings. Browser evidence confirmed no horizontal overflow, 48px billing tabs, and a 44px checkout action.

## Overall Impression

The page now puts the payment decision first and states the actual annual charge clearly. It feels calm, trustworthy, and consistent with the authenticated SaveIt.now product.

## What's Working

- `$60/year` is the dominant annual amount, while `$5/month` is correctly presented as an equivalent.
- The mobile flow reaches the price before the benefit list and is substantially shorter than the previous page.
- The checkout action, automatic-renewal disclosure, Stripe reassurance, and cross-device entitlement are grouped around the decision.

## Priority Issues

No P0 or P1 issues remain after implementation.

- **[P3] Global local-development analytics noise**: `/api/insights/script` returns a local-only 404/MIME console error. This is outside the upgrade component and does not affect the payment UI.

## Persona Red Flags

- **Casey, distracted mobile user**: No blocking red flag remains. The pricing selector is 48px high, the CTA is 44px high, and there is no horizontal overflow.
- **Riley, stress tester**: The charge, renewal cadence, cancellation route, canceled state, and failure state are visible in plain language.
- **Jordan, first-timer**: The page title names the task, the selected plan is visible, and the next action clearly says checkout opens securely.

## Minor Observations

- The global support launcher remains visible, but it does not cover the billing tabs or checkout action in the verified layouts.
- The default annual plan is visually selected and paired with a concrete `$48/year` saving rather than a vague best-value label.

## Questions to Consider

- Should the yearly plan remain the default if future regional pricing differs from the current US dollar plans?
- Should the global support launcher be hidden during the final Stripe handoff in a later conversion-focused experiment?
