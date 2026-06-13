import { handler } from "@/lib/auth-server";
import { createFileRoute } from "@tanstack/react-router";

// Delegates all /api/auth/* requests to the Convex Better Auth handler
// through the .convex.site deployment.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handler(request),
      POST: async ({ request }: { request: Request }) => handler(request),
    },
  },
});
