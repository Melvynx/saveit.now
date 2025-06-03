import { MaxWidthContainer } from "@/features/page/page";
import { MDXRemote } from "next-mdx-remote-client/rsc";

const termsContent = `# General Terms and Conditions

_Last updated: 2025-06-03_

---

## 1. Acceptance of Terms

By accessing and using SaveIt.now, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Service Description

SaveIt.now is a bookmark management service that allows users to save, organize, and search their web bookmarks using AI-powered features.

## 3. User Accounts

### 3.1 Account Creation
- You must provide accurate and complete information when creating an account
- You are responsible for maintaining the confidentiality of your account credentials
- You must notify us immediately of any unauthorized use of your account

### 3.2 Account Responsibilities
- You are solely responsible for all activities under your account
- You must not share your account with others
- You must keep your contact information up to date

## 4. Acceptable Use

### 4.1 Permitted Uses
You may use SaveIt.now to:
- Save and organize web bookmarks
- Search and manage your saved content
- Use AI features to enhance your bookmark organization

### 4.2 Prohibited Uses
You may not:
- Use the service for illegal activities
- Attempt to reverse engineer or hack the service
- Share copyrighted content without permission
- Spam or abuse the service
- Violate any applicable laws or regulations

## 5. Service Availability

- SaveIt.now is provided on a best-effort basis
- We do not guarantee 100% uptime
- Scheduled maintenance may temporarily interrupt service
- We are not liable for service interruptions

## 6. Data and Privacy

- Your data privacy is governed by our Privacy Policy
- We reserve the right to remove content that violates our terms
- You retain ownership of your bookmarks and data
- We may use aggregated, anonymized data for service improvement

## 7. Intellectual Property

- SaveIt.now and its features are protected by intellectual property laws
- You may not copy, modify, or distribute our service
- User-generated content remains the property of the user

## 8. Limitation of Liability

SaveIt.now is provided "as is" without warranties. We are not liable for:
- Data loss or corruption
- Service interruptions
- Third-party actions
- Indirect or consequential damages

## 9. Termination

- You may terminate your account at any time
- We may suspend or terminate accounts for violations of these terms
- Upon termination, your data may be deleted after a reasonable period

## 10. Changes to Terms

- We reserve the right to modify these terms at any time
- Continued use of the service constitutes acceptance of modified terms
- We will notify users of significant changes

## 11. Governing Law

These terms are governed by the laws of the United States.

## 12. Contact Information

For questions about these terms, contact us at:

📧 **help@saveit.now**

---

© ${new Date().getFullYear()} SaveIt.now — All rights reserved.`;

export default async function TermsPage() {
  return (
    <MaxWidthContainer className="py-16">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <MDXRemote source={termsContent} />
      </article>
    </MaxWidthContainer>
  );
}
