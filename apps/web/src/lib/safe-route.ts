import { validateApiKey } from "@/lib/auth/api-key-auth";
import { createZodRoute } from "next-zod-route";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { ApplicationError, SafeRouteError } from "./errors";
import { logger } from "./logger";

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

const deduplicateCookies = (headers: Headers): Headers => {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return headers;

  const parts = cookieHeader.split(";").map((c) => c.trim()).filter(Boolean);
  const seen = new Set<string>();
  let hasDuplicates = false;
  for (const part of parts) {
    const key = part.split("=")[0]?.trim();
    if (key && seen.has(key)) {
      hasDuplicates = true;
      break;
    }
    if (key) seen.add(key);
  }
  if (!hasDuplicates) return headers;

  // Keep LAST occurrence of each cookie (most recently set value)
  const cookieMap = new Map<string, string>();
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.substring(0, eqIdx).trim();
    cookieMap.set(key, part);
  }

  const newHeaders = new Headers(headers);
  newHeaders.set("cookie", Array.from(cookieMap.values()).join("; "));
  return newHeaders;
};

const getSessionFromRequest = async (request: Request) => {
  const headers = deduplicateCookies(request.headers);
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
};

export const userRoute = routeClient.use(async ({ next, request }) => {
  const user = await getSessionFromRequest(request);
  if (!user) {
    const cookieHeader = request.headers.get("cookie");
    const userAgent = request.headers.get("user-agent") || "";
    logger.warn("[AUTH] userRoute session failed", {
      hasCookie: !!cookieHeader,
      cookieKeys: cookieHeader
        ? cookieHeader
            .split(";")
            .map((c) => c.trim().split("=")[0])
            .filter(Boolean)
        : [],
      userAgent: userAgent.substring(0, 100),
      url: request.url,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return next({ ctx: { user } });
});

export const adminRoute = routeClient.use(async ({ next, request }) => {
  const user = await getSessionFromRequest(request);
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
