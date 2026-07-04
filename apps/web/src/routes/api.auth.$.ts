import { handler } from "@/lib/auth-server";
import { legacyOptions } from "@/lib/legacy-api";
import { createFileRoute } from "@tanstack/react-router";

// Delegates all /api/auth/* requests to the Convex Better Auth handler
// through the .convex.site deployment.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handler(request),
      OPTIONS: async ({ request }: { request: Request }) =>
        legacyOptions(request),
      POST: async ({ request }: { request: Request }) => handler(request),
    },
  },
});
