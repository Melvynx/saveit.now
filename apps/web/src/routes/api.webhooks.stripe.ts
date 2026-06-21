import { proxyToConvexSite } from "@/lib/convex-site-proxy";
import { createFileRoute } from "@tanstack/react-router";

const proxy = ({ request }: { request: Request }) =>
  proxyToConvexSite(request, "/stripe/webhook");

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      DELETE: proxy,
      GET: proxy,
      HEAD: proxy,
      OPTIONS: proxy,
      PATCH: proxy,
      POST: proxy,
      PUT: proxy,
    },
  },
});
