import { env } from "../env";

interface ScreenshotOptions {
  url: string;
  viewport?: { width: number; height: number };
  waitUntil?: "load" | "networkidle0" | "networkidle2";
  timeout?: number;
  fullPage?: boolean;
}

export async function captureScreenshot(
  options: ScreenshotOptions,
): Promise<Buffer> {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/screenshot`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: options.url,
        gotoOptions: {
          waitUntil: options.waitUntil || "networkidle0",
          timeout: options.timeout || 30000,
        },
        viewport: options.viewport || { width: 1920, height: 1080 },
        screenshotOptions: {
          fullPage: options.fullPage || false,
          type: "png",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Screenshot failed (${response.status}): ${errorText || response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function capturePDFScreenshot(url: string): Promise<Buffer> {
  const pdfUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

  return captureScreenshot({
    url: pdfUrl,
    viewport: { width: 1920, height: 1080 },
    waitUntil: "networkidle0",
    timeout: 30000,
  });
}
