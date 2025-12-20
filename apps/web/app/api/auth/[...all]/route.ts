import { auth } from "@/lib/auth"; // path to your auth file
import { updateHeaders } from "@/lib/cors";
import { logger } from "@/lib/logger";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);

export const POST = async (request: Request) => {
  const url = new URL(request.url);
  const isStripeWebhook = url.pathname.includes("stripe/webhook");

  if (isStripeWebhook) {
    logger.info("📥 Stripe webhook received", {
      pathname: url.pathname,
      method: request.method,
    });
  }

  const response = await handlers.POST(request);
  const headers = updateHeaders(response.headers, request);

  if (isStripeWebhook) {
    logger.info("📤 Stripe webhook response", {
      status: response.status,
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
};

export const GET = async (request: Request) => {
  const response = await handlers.GET(request);
  const headers = updateHeaders(response.headers, request);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
};

export const OPTIONS = async (request: Request) => {
  const headers = new Headers();
  updateHeaders(headers, request);

  return new Response(null, {
    status: 204,
    headers,
  });
};
