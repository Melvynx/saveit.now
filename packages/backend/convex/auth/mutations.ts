import { v } from "convex/values";
import { httpAction } from "../_generated/server";
import { components } from "../_generated/api";
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

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? "";

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
  const userId = url.searchParams.get("userId");
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

  // Verify HMAC-SHA256 token
  const expected = await hmacSha256Hex(
    BETTER_AUTH_SECRET,
    `${userId}:${timestamp}`,
  );

  if (expected !== token) {
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

  return new Response(
    JSON.stringify({ success: true, message: "You have been unsubscribed." }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
