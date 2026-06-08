import { auth } from "@/lib/auth";
import { updateHeaders } from "@/lib/cors";
import { createFileRoute } from "@tanstack/react-router";

const handler = async ({ request }: { request: Request }) => {
  const response = await auth.handler(request);
  const headers = updateHeaders(response.headers, request);
  return new Response(response.body, {
    status: response.status,
    headers,
  });
};

const optionsHandler = ({ request }: { request: Request }) => {
  const headers = new Headers();
  updateHeaders(headers, request);
  return new Response(null, { status: 204, headers });
};

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      OPTIONS: optionsHandler,
    },
  },
});
