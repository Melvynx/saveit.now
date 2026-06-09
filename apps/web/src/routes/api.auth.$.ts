import { handler } from "@/lib/auth-server";
import { createFileRoute } from "@tanstack/react-router";

// Delegates all /api/auth/* requests to the Convex Better Auth handler
// (proxies to the .convex.site deployment). Replaces the former Prisma-based
// Better Auth catch-all.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handler(request),
      POST: async ({ request }: { request: Request }) => handler(request),
    },
  },
});
