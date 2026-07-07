import {
  legacyErrorResponse,
  legacyJson,
  legacyOptions,
  requireLegacySession,
} from "@/lib/legacy-api";
import { fetchAuthAction } from "@/lib/auth-server";
import { makeFunctionReference, type FunctionReference } from "convex/server";
import { createFileRoute } from "@tanstack/react-router";

type MobileCheckoutAction = FunctionReference<
  "action",
  "public",
  {
    annual?: boolean;
    successUrl: string;
    cancelUrl: string;
  },
  {
    checkoutUrl: string;
  }
>;

const mobileCheckout = makeFunctionReference<
  "action",
  {
    annual?: boolean;
    successUrl: string;
    cancelUrl: string;
  },
  {
    checkoutUrl: string;
  }
>("api/mobile:createCheckout") as MobileCheckoutAction;

export const Route = createFileRoute("/api/mobile/checkout")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const user = await requireLegacySession(request);
        if (user instanceof Response) return user;

        try {
          const body = (await request.json()) as {
            annual?: unknown;
            successUrl?: unknown;
            cancelUrl?: unknown;
          };

          if (
            typeof body.successUrl !== "string" ||
            typeof body.cancelUrl !== "string"
          ) {
            return legacyJson(
              { error: "Invalid checkout request" },
              { request, status: 400 },
            );
          }

          const result = await fetchAuthAction(mobileCheckout, {
            annual: body.annual === true,
            successUrl: body.successUrl,
            cancelUrl: body.cancelUrl,
          });

          return legacyJson(result, { request });
        } catch (error) {
          return legacyErrorResponse(error, request);
        }
      },
      OPTIONS: async ({ request }: { request: Request }) =>
        legacyOptions(request),
    },
  },
});
