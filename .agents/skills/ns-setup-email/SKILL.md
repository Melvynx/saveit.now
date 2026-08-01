---
name: ns-setup-email
description: Configure and verify NowStack Mobile transactional email with Resend and Convex. Use for sender/domain setup, OTP delivery, password/reset messages, production email credentials, or deliverability failures.
---

# Setup Email - NowStack Mobile

<objective>
Configure a deployment-specific verified sender and prove a real transactional email from the actual Better Auth/Convex path.
</objective>

<required_reads>
Read `convex/auth.ts`, `convex/emailActions.ts`, `convex/emailTemplates.ts`, `convex/siteConfig.ts`, `site-config.ts`, and `.agents/rules/auth-payments-storage.md` before editing.
</required_reads>

<workflow>
1. Choose development or production explicitly. Never copy a dev API key into production.
2. Confirm the sender domain and From address belong to the product. Obtain DNS values from Resend and present exact records; DNS mutation needs separate authorization.
3. Create a least-privilege deployment-specific Resend key. Read it silently and set it through stdin:

```bash
read -rsp "Resend API key: " RESEND_API_KEY; echo
printf '%s' "$RESEND_API_KEY" | npx convex env set <optional --prod> RESEND_API_KEY
unset RESEND_API_KEY
printf '%s' 'Product <hello@example.com>' | npx convex env set <optional --prod> EMAIL_FROM
```

4. Wait for provider DNS verification and read it back. Do not claim propagation from local DNS alone.
5. Trigger email OTP through the real signed-out app/web flow to a controlled inbox. Verify provider event, Convex logs, inbox delivery, links/code, sender, subject, and no secret/PII logging.
6. Run `ns-check-setup` for the target deployment.
</workflow>

<boundaries>
App Review credentials are a separate private no-delivery path and must not reuse an email delivery key. Production proof without Resend/provider access is `NOT VERIFIABLE`.
</boundaries>
