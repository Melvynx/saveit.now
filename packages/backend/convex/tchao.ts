import { authQuery } from "./functions";

/**
 * tchao.getUserHash — authQuery
 *
 * HMAC-SHA256 hex signature of the authenticated user's normalized email,
 * keyed with the Tchao website identity secret (TCHAO_IDENTITY_SECRET).
 * The web app passes it as `userHash` in `Tchao.identify()` so Tchao trusts
 * the visitor identity: https://tchao.app/docs/identity-verification
 *
 * Returns null when no hash can be produced (missing email or secret). The
 * caller then falls back to an unsigned identify, which keeps working while
 * the website verification mode is Off/Optional.
 */
export const getUserHash = authQuery({
  args: {},
  handler: async (ctx) => {
    const email = ctx.user.email.trim().toLowerCase();
    if (!email) {
      return null;
    }

    const secret = process.env.TCHAO_IDENTITY_SECRET;
    if (!secret) {
      console.warn("TCHAO_IDENTITY_SECRET is not configured");
      return null;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(email),
    );

    return Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  },
});
