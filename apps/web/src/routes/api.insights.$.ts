import { createFileRoute } from "@tanstack/react-router";

const UMAMI_ORIGIN = "https://analytics.melvynx.dev";
const MAX_EVENT_BYTES = 64 * 1024;

const forwardedRequestHeaders = [
  "accept-language",
  "user-agent",
  "x-forwarded-for",
  "x-real-ip",
] as const;

function getProxyHeaders(request: Request) {
  const headers = new Headers();

  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

function proxyResponse(response: Response, cacheControl: string) {
  const headers = new Headers({ "Cache-Control": cacheControl });
  const contentType = response.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

export const Route = createFileRoute("/api/insights/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (new URL(request.url).pathname !== "/api/insights/script") {
          return new Response("Not found", { status: 404 });
        }

        const response = await fetch(`${UMAMI_ORIGIN}/script.js`, {
          headers: getProxyHeaders(request),
        });

        return proxyResponse(response, "public, max-age=3600");
      },
      POST: async ({ request }: { request: Request }) => {
        if (new URL(request.url).pathname !== "/api/insights/api/send") {
          return new Response("Not found", { status: 404 });
        }

        const body = await request.arrayBuffer();
        if (body.byteLength > MAX_EVENT_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }

        const headers = getProxyHeaders(request);
        headers.set("Content-Type", "application/json");

        const response = await fetch(`${UMAMI_ORIGIN}/api/send`, {
          method: "POST",
          headers,
          body,
        });

        return proxyResponse(response, "no-store");
      },
    },
  },
});
