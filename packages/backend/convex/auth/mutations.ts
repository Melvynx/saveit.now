import { v } from "convex/values";
import { httpAction } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { authComponent, createAuth } from "./config";
import { authMutation } from "../functions";

/**
 * updateProfile — authMutation
 *
 * Updates the authenticated user's name and/or email via Better Auth APIs.
 * - name → auth.api.updateUser({ body: { name } })
 * - email → auth.api.changeEmail({ body: { newEmail, callbackURL: "/account" } })
 *
 * Spec 12 §2.1, Spec 01 §16, Contract §A auth/mutations.ts
 */
export const updateProfile = authMutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    if (args.name) {
      await auth.api.updateUser({
        body: { name: args.name },
        headers,
      });
    }

    if (args.email) {
      await auth.api.changeEmail({
        body: { newEmail: args.email, callbackURL: "/account" },
        headers,
      });
    }

    return null;
  },
});

function getBetterAuthSecret(): string | null {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  return secret ? secret : null;
}

function hmacSha256Hex(secret: string, message: string): Promise<string> {
  // We're in default runtime (no "use node"), but we need crypto.
  // Web Crypto API is available in the Convex V8 runtime.
  const encoder = new TextEncoder();
  return crypto.subtle
    .importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    .then((key) => crypto.subtle.sign("HMAC", key, encoder.encode(message)))
    .then((sig) =>
      Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
}

/**
 * unsubscribe — httpAction
 *
 * Verifies the HMAC-SHA256 token in the request URL params, then sets
 * user.unsubscribed = true via patchUser.
 *
 * URL params expected: userId, token, timestamp (used for HMAC payload).
 * HMAC payload: `${userId}:${timestamp}` signed with BETTER_AUTH_SECRET.
 *
 * Spec 08 §2.6 + §5.3, Contract §A auth/mutations.ts, Contract §E.15
 */
export const unsubscribe = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathUserId = url.pathname.startsWith("/unsubscribe/")
    ? decodeURIComponent(url.pathname.slice("/unsubscribe/".length)).split(
        "/",
      )[0]
    : null;
  const userId = url.searchParams.get("userId") ?? pathUserId;
  const token = url.searchParams.get("token");
  const timestamp = url.searchParams.get("timestamp");

  if (!userId || !token || !timestamp) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters", success: false }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const secret = getBetterAuthSecret();
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "Unsubscribe is temporarily unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Verify HMAC-SHA256 token
  const expected = await hmacSha256Hex(secret, `${userId}:${timestamp}`);

  const validToken =
    /^[a-f0-9]{64}$/i.test(token) &&
    expected.length === token.length &&
    Array.from(expected).reduce(
      (difference, character, index) =>
        difference | (character.charCodeAt(0) ^ token.charCodeAt(index)),
      0,
    ) === 0;

  if (!validToken) {
    return new Response(
      JSON.stringify({ error: "Invalid unsubscribe token", success: false }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Mark user as unsubscribed
  await ctx.runMutation(components.betterAuth.data.patchUser, {
    userId,
    update: { unsubscribed: true },
  });

  await ctx.runMutation(internal.integrations.workflows.queueUnsubscribe, {
    userId,
  });

  return new Response(
    JSON.stringify({
      success: true,
      message:
        "Your unsubscribe request was accepted and is being synchronized.",
    }),
    {
      status: 202,
      headers: { "Content-Type": "application/json" },
    },
  );
});
