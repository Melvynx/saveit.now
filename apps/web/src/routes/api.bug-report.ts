import {
  legacyErrorResponse,
  legacyJson,
  legacyOptions,
  requireLegacySession,
} from "@/lib/legacy-api";
import { fetchAuthAction } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/bug-report")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const user = await requireLegacySession(request);
        if (user instanceof Response) return user;

        try {
          const body = (await request.json()) as {
            description?: unknown;
            deviceInfo?: unknown;
            appVersion?: unknown;
          };

          if (
            typeof body.description !== "string" ||
            body.description.length < 10
          ) {
            return legacyJson(
              { error: "Bug description must be at least 10 characters" },
              { request, status: 400 },
            );
          }

          await fetchAuthAction(api.users.actions.sendBugReport, {
            description: body.description,
            deviceInfo:
              typeof body.deviceInfo === "string" ? body.deviceInfo : undefined,
            appVersion:
              typeof body.appVersion === "string" ? body.appVersion : undefined,
          });

          return legacyJson(
            {
              success: true,
              message: "Bug report sent successfully",
            },
            { request },
          );
        } catch (error) {
          return legacyErrorResponse(error, request);
        }
      },
      OPTIONS: async ({ request }: { request: Request }) =>
        legacyOptions(request),
    },
  },
});
