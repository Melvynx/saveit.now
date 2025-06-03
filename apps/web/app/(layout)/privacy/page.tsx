import { MaxWidthContainer } from "@/features/page/page";
import { MDXRemote } from "next-mdx-remote-client/rsc";

const privacyContent = `# Terms of Service & Privacy Policy

_Last updated: 2025-06-03_

---

## Terms of Service

### 1. Subscription & Pricing

SaveIt.now offers a subscription-based service:

- **$9/month**, billed monthly
- **$5/month**, billed annually ($60/year)

You can cancel at any time via the Stripe billing portal. Your subscription will automatically renew unless canceled before the renewal date.

### 2. Refund Policy

We offer a **7-day unconditional refund**.  
If you've saved over 100 links in that period, we reserve the right to deny the refund in cases of clear abuse.

### 3. Payment Processor

All payments are securely handled via **Stripe**.

### 4. Target Audience

SaveIt.now is designed for developers, creators, and tech-savvy individuals who regularly consume and organize content online.

### 5. Availability

The service is provided on a best-effort basis. While we strive for 24/7 uptime, we do not provide a formal SLA.

---

## Privacy Policy

### 1. Who we are

SaveIt.now is operated by **Codelynx, LLC**, registered in the United States.

### 2. What we collect

We collect and store:

- Your **email address**
- Your **name** (if provided)

We do **not** sell your data to third parties.

### 3. Third-party services

We use the following services:

- **Stripe** for payment
- **Vercel** for hosting
- **Posthog** for product analytics

These services may receive limited user data strictly to provide their functionality.

### 4. Data Deletion

You can request to delete your data at any time by contacting us.

📧 **help@saveit.now**

### 5. European Users (GDPR)

SaveIt.now is not specifically targeting European users. GDPR compliance may be partial and no DPO is appointed at this time.

---

© ${new Date().getFullYear()} SaveIt.now — All rights reserved.`;

export default async function PrivacyPage() {
  return (
    <MaxWidthContainer className="py-16">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <MDXRemote source={privacyContent} />
      </article>
    </MaxWidthContainer>
  );
}
