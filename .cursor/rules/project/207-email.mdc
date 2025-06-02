---
description: EXPLAIN how to create email template and how to use them
globs: 
alwaysApply: false
---
## Context

* We use React-Email and Resend to send email.
* We use Resend to send this email

## Create email

Go in the folder `/emails` to create an email, you can follow the example of [magic-link-email.email.tsx](mdc:emails/magic-link-email.email.tsx) `<EmailLayout />` will define the default beautiful layout for an email.

## Use email

Use the utility `sendEmail` when you need to send an email.

Exemple: 

```ts
import { sendEmail } from "@/lib/mail/sendEmail";

const result = await sendEmail({
  to: email,
  subject: `Sign in to ${SiteConfig.domain}`,
  react: MagicLinkMail({
    url,
  }),
  text: `Here is your magic link : ${url}`
});
```

* to : email adresse of the recipient
* subject : subject of the email
* react : React component, you must never instanciate it with `<MagicLinkMail>` but always with object props
* text : the plain text of the email to improve delivrability

## Markdown Email

For a better maintability as I do on [auth.ts](mdc:src/lib/auth.ts) I will use MarkdownEmail : 

```ts
import MarkdownEmail from "@email/markdown.email";
import { sendEmail } from "@/lib/mail/sendEmail";

await sendEmail({
  to: newEmail,
  subject: "Change email address",
  react: MarkdownEmail({
    preview: `Change your email address for ${SiteConfig.title}`,
    markdown: `
    Hello,

    You requested to change your email address.

    Click here : ${url}
    `,
  }),
});
```