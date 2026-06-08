import { validateApiKey } from "@/lib/auth/api-key-auth";
import { auth } from "./auth";
import { ApplicationError, SafeRouteError } from "./errors";
import { logger } from "./logger";
import type { z } from "zod";

export function jsonError(error: unknown) {
  if (error instanceof SafeRouteError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ApplicationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  console.error(error);
  return Response.json(
    { error: "An unexpected error occurred" },
    { status: 500 },
  );
}

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

export const getUserFromRequest = getSessionFromRequest;

export async function requireUser(request: Request) {
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
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await getSessionFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  return user;
}

export async function requireApiKey(request: Request) {
  const validation = await validateApiKey(request);

  if (!validation.success) {
    return Response.json(
      { error: validation.error || "Authentication failed", success: false },
      { status: validation.status || 401 },
    );
  }

  return { user: validation.user, apiKey: validation.apiKey };
}

type RouteContext = Record<string, unknown>;
type HandlerArgs<TParams, TQuery, TBody, TContext extends RouteContext> = {
  params: TParams;
  query: TQuery;
  body: TBody;
  ctx: TContext;
};
type ServerRouteArgs = {
  request: Request;
  params?: Record<string, string>;
};
type RouteHandler<TParams, TQuery, TBody, TContext extends RouteContext> = (
  request: Request,
  args: HandlerArgs<TParams, TQuery, TBody, TContext>,
) => Promise<Response | unknown> | Response | unknown;

const toResponse = (value: unknown) => {
  if (value instanceof Response) return value;
  return Response.json(value);
};

const parseBody = async (request: Request) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return Object.fromEntries(await request.formData());
  }
  if (contentType.includes("application/json")) {
    return request.json();
  }
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const parseQuery = (request: Request) => {
  const searchParams = new URL(request.url).searchParams;
  const query: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    query[key] = values.length > 1 ? values : (values[0] ?? "");
  }
  return query;
};

class StandardRouteBuilder<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TContext extends RouteContext = Record<string, never>,
> {
  constructor(
    private readonly getContext: (
      request: Request,
    ) => Promise<Response | TContext>,
    private readonly paramsSchema?: z.ZodType<TParams>,
    private readonly querySchema?: z.ZodType<TQuery>,
    private readonly bodySchema?: z.ZodType<TBody>,
  ) {}

  params<TNextParams>(schema: z.ZodType<TNextParams>) {
    return new StandardRouteBuilder<TNextParams, TQuery, TBody, TContext>(
      this.getContext,
      schema,
      this.querySchema,
      this.bodySchema,
    );
  }

  query<TNextQuery>(schema: z.ZodType<TNextQuery>) {
    return new StandardRouteBuilder<TParams, TNextQuery, TBody, TContext>(
      this.getContext,
      this.paramsSchema,
      schema,
      this.bodySchema,
    );
  }

  body<TNextBody>(schema: z.ZodType<TNextBody>) {
    return new StandardRouteBuilder<TParams, TQuery, TNextBody, TContext>(
      this.getContext,
      this.paramsSchema,
      this.querySchema,
      schema,
    );
  }

  handler(handler: RouteHandler<TParams, TQuery, TBody, TContext>) {
    return async ({ request, params = {} }: ServerRouteArgs) => {
      try {
        const ctx = await this.getContext(request);
        if (ctx instanceof Response) return ctx;

        const parsedParams = this.paramsSchema
          ? this.paramsSchema.parse(params)
          : (params as TParams);
        const parsedQuery = this.querySchema
          ? this.querySchema.parse(parseQuery(request))
          : (parseQuery(request) as TQuery);
        const parsedBody = this.bodySchema
          ? this.bodySchema.parse(await parseBody(request))
          : (undefined as TBody);

        return toResponse(
          await handler(request, {
            params: parsedParams,
            query: parsedQuery,
            body: parsedBody,
            ctx,
          }),
        );
      } catch (error) {
        return jsonError(error);
      }
    };
  }
}

export const routeClient = new StandardRouteBuilder(async () => ({}));

export const userRoute = new StandardRouteBuilder(async (request) => {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return { user };
});

export const adminRoute = new StandardRouteBuilder(async (request) => {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  return { user };
});

export const apiRoute = new StandardRouteBuilder(async (request) => {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;
  return auth;
});
