import { getUser } from "@/lib/auth-session";
import { createZodRoute } from "next-zod-route";
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "./auth/api-key-auth";
import { ApplicationError, SafeRouteError } from "./errors";

/**
 * Type-safe route handlers with Zod validation for params, query, and body.
 *
 * @example GET route with params and query:
 * ```ts
 * export const GET = routeClient
 *   .params(z.object({ id: z.string() }))
 *   .query(z.object({ search: z.string().optional() }))
 *   .handler((request, context) => {
 *     const { id } = context.params;
 *     const { search } = context.query;
 *     return Response.json({ id, search });
 *   });
 * ```
 *
 * @example POST route with body validation:
 * ```ts
 * export const POST = routeClient
 *   .body(z.object({ name: z.string(), email: z.string().email() }))
 *   .handler((request, context) => {
 *     const { name, email } = context.body;
 *     return Response.json({ success: true, name, email });
 *   });
 * ```
 *
 * @example Combined validation:
 * ```ts
 * export const PUT = routeClient
 *   .params(z.object({ id: z.string() }))
 *   .body(z.object({ name: z.string() }))
 *   .handler((request, context) => {
 *     const { id } = context.params;
 *     const { name } = context.body;
 *     return Response.json({ id, name });
 *   });
 * ```
 */
export const routeClient = createZodRoute({
  handleServerError: (error) => {
    if (error instanceof SafeRouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  },
});

/**
 * Route for authenticated user endpoints. User is available in context.data.
 *
 * @example User route:
 * ```ts
 * export const GET = userRoute
 *   .handler((request, context) => {
 *     const { user } = context.data;
 *     return Response.json({ userId: user.id });
 *   });
 * ```
 *
 * @example User route with body:
 * ```ts
 * export const POST = userRoute
 *   .body(z.object({ content: z.string() }))
 *   .handler((request, context) => {
 *     const { user } = context.data;
 *     const { content } = context.body;
 *     return Response.json({ success: true, userId: user.id });
 *   });
 * ```
 */
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

/**
 * Usage Notes:
 *
 * - Validation errors return 400 with { "message": "Invalid params/query/body" }
 * - Throw SafeRouteError for custom error responses: throw new SafeRouteError("message", 422)
 * - Access validated data via context.params, context.query, context.body
 * - userRoute provides context.data.user, apiRoute provides context.data.user and context.data.apiKey
 */
