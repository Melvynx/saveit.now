import {
  legacyErrorResponse,
  legacyJson,
  legacyOptions,
  normalizeUserLimitsResponse,
  requireLegacySession,
} from "@/lib/legacy-api";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/user/limits")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const user = await requireLegacySession(request);
        if (user instanceof Response) return user;

        try {
          const result = await fetchAuthQuery(api.users.queries.getLimits);
          return legacyJson(normalizeUserLimitsResponse(result), { request });
        } catch (error) {
          return legacyErrorResponse(error, request);
        }
      },
      OPTIONS: async ({ request }: { request: Request }) =>
        legacyOptions(request),
    },
  },
});
