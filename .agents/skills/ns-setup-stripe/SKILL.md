---
name: ns-setup-stripe
description: Configure Stripe for NowStack Mobile web and Android payments while preserving Apple IAP on iOS. Use for price ids, keys, webhooks, and payment config.
---

# Setup Stripe - NowStack Mobile

<objective>
Configure Stripe where this repo uses Stripe: web and Android payment surfaces, with server-side logic in Convex. iOS production payments stay on Apple IAP.
</objective>

<rules>
- Never ask for Stripe secrets and plan details in the same message.
- Never commit Stripe secrets to `.env`, `.env.local`, docs, `site-config.ts`, or package files.
- Store `STRIPE_SECRET_KEY`, webhook secrets, and server-only price ids in Convex env when server code reads them.
- Public publishable keys are not secrets, but still avoid hardcoding them unless the repo convention requires it.
- Keep `site-config.ts` and `convex/siteConfig.ts` aligned with payment ids and product metadata.
- Do not add `convex/billing/plans.ts` or NowStack SaaS multi-plan subscription files unless the repo actually introduces that model.
</rules>

<first_steps>
Read:

```bash
sed -n '1,260p' site-config.ts
find convex -maxdepth 3 -type f | sort
rg -n "STRIPE|stripe|iap|payment|price|product" site-config.ts convex web-app mobile-app
```

If editing Convex code, read:

```bash
sed -n '1,220p' convex/_generated/ai/guidelines.md
```
</first_steps>

<workflow>
1. Preflight current payment shape from `site-config.ts`, Convex payment functions, web checkout UI, and mobile payment code.
2. Ask for Stripe mode (`test` or `live`) and required keys. Stop until provided.
3. Set server-side Stripe values in Convex env with `npx convex env set`.
4. Update config/code for the price/product ids actually used by this repo.
5. Verify Convex compile plus changed web/mobile surfaces.
6. For iOS, verify the Apple IAP product id remains configured and do not replace it with Stripe.
</workflow>

<env_examples>
Use the names actually consumed by the current code. Common values may include:

```bash
npx convex env set STRIPE_SECRET_KEY "sk_test_..."
npx convex env set STRIPE_WEBHOOK_SECRET "whsec_..."
npx convex env set STRIPE_PRICE_ID "price_..."
```

If the code uses different names, follow the code.
</env_examples>

<verification>
```bash
npx convex dev --once
cd web-app && npm run typecheck
cd web-app && npm run build
cd mobile-app && npx tsc --noEmit
```

For live Stripe object creation, dry-run or inspect first, then require explicit confirmation before mutating the user's Stripe account.
</verification>

<success_criteria>
- Stripe is configured only for web/Android paths.
- iOS Apple IAP remains the iOS production payment path.
- Server secrets are in Convex env, not git.
- `site-config.ts` and Convex payment code agree.
- Relevant checks pass or blockers are documented.
</success_criteria>
