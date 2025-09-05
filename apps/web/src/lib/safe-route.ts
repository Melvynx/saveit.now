import { getUser } from "@/lib/auth-session";
import { validateApiKey } from "@/lib/auth/api-key-auth";
import { createZodRoute } from "next-zod-route";
import { NextRequest, NextResponse } from "next/server";
import { ApplicationError, SafeRouteError } from "./errors";

export const routeClient = createZodRoute({
  handleServerError: (error) => {
    if (error instanceof SafeRouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  },
});

export const userRoute = routeClient.use(async ({ next }) => {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return next({ ctx: { user } });
});

export const adminRoute = routeClient.use(async ({ next }) => {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return next({ ctx: { user } });
});

export const apiRoute = routeClient.use(async ({ next, request }) => {
  const validation = await validateApiKey(request as NextRequest);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error || "Authentication failed", success: false },
      { status: validation.status || 401 },
    );
  }

  const { user, apiKey } = validation;
  return next({ ctx: { user, apiKey } });
});
