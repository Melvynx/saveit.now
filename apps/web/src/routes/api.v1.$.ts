import { proxyToConvexSite } from "@/lib/convex-site-proxy";
import { createFileRoute } from "@tanstack/react-router";

const proxy = ({ request }: { request: Request }) => proxyToConvexSite(request);

export const Route = createFileRoute("/api/v1/$")({
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
