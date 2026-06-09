"use node";

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Markdown,
  Preview,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

// ---------------------------------------------------------------------------
// Base URL for images in emails.
// Use SITE_URL env var; fall back to https://saveit.now so localhost URLs are
// never embedded in real email clients (they can't reach localhost).
// ---------------------------------------------------------------------------
const getBaseUrl = () => {
  const url = process.env.SITE_URL ?? "https://saveit.now";
  if (url.startsWith("http://localhost") || url.startsWith("http://127.")) {
    return "https://saveit.now";
  }
  return url;
};

// ---------------------------------------------------------------------------
// EmailLayout
// ---------------------------------------------------------------------------
type EmailLayoutProps = {
  children: React.ReactNode;
  disableTailwind?: boolean;
};

export function EmailLayout({ children, disableTailwind }: EmailLayoutProps) {
  const baseUrl = getBaseUrl();

  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#ffffff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
        }}
      >
        <Container
          style={{
            margin: "0 auto",
            padding: "1.5rem",
          }}
        >
          <Tailwind>
            <table cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "8px" }}>
                    <Img
                      src={`${baseUrl}/images/logo.png`}
                      height={32}
                      alt="SaveIt.now"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <Hr style={{ marginTop: "12px", marginBottom: "24px", borderColor: "#d1d5db" }} />
          </Tailwind>

          {disableTailwind ? children : <Tailwind>{children}</Tailwind>}

          <Tailwind>
            <Hr style={{ marginTop: "48px", marginBottom: "24px", borderColor: "#d1d5db" }} />
            <table cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "8px" }}>
                    <Img
                      src={`${baseUrl}/images/logo.png`}
                      height={32}
                      alt="SaveIt.now"
                    />
                  </td>
                  <td>
                    <Text style={{ fontSize: "1.125rem" }}>SaveIt.now</Text>
                  </td>
                </tr>
              </tbody>
            </table>
            <Text style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Melvyn, from SaveIt.now
            </Text>
            <Text style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Bali, Indonesia
            </Text>
          </Tailwind>
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// MarkdownEmail
// ---------------------------------------------------------------------------
type MarkdownEmailProps = {
  markdown: string;
  preview?: string;
  disabledSignature?: boolean;
};

export function MarkdownEmail({
  markdown,
  preview,
  disabledSignature = false,
}: MarkdownEmailProps) {
  let content = markdown;

  if (!disabledSignature) {
    content += `\n\nBest,\n\nMelvyn from SaveIt.now`;
  }

  // Normalize markdown by trimming each line (matching original behaviour).
  content = content
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  return (
    <EmailLayout disableTailwind>
      <Preview>{preview ?? "You receive a markdown email."}</Preview>
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: "1.125rem", lineHeight: "1.5rem" },
          li: { fontSize: "1.125rem", lineHeight: "1.5rem" },
          link: { color: "#6366f1" },
        }}
      >
        {content}
      </Markdown>
    </EmailLayout>
  );
}
