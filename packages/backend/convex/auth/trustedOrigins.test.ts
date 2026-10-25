import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret-123";
  process.env.SITE_URL = "https://saveit.now";
  process.env.CONVEX_SITE_URL = "https://example.convex.site";
  return {
    emails: [] as Array<Record<string, any>>,
    db: {} as Record<string, any[]>,
  };
});

vi.mock("@convex-dev/better-auth", async () => {
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  return {
    createClient: () => ({
      adapter: () => memoryAdapter(h.db),
      registerRoutes: () => {},
      clientApi: () => ({}),
    }),
  };
});

vi.mock("@convex-dev/better-auth/utils", () => ({
  requireRunMutationCtx: () => ({
    scheduler: {
      runAfter: async (_delay: number, _fn: unknown, params: any) => {
        h.emails.push(params);
      },
    },
    runMutation: async () => ({ allowed: true }),
  }),
}));

vi.mock("@convex-dev/better-auth/plugins", async (importOriginal) => {
  const real: any = await importOriginal();
  // Keep crossDomain real: it mints the `ott` that makes F1 exploitable.
  return { ...real, convex: () => ({ id: "convex-noop" }) };
});

import { betterAuth } from "better-auth";
import { createAuthOptions } from "./config";

const AUTH_BASE = "https://example.convex.site/api/auth";
const SITE = "https://saveit.now";
const VICTIM = { id: "victim-user", email: "victim@example.com" };

// Better Auth skips origin/callback checks under NODE_ENV=test; force prod behaviour.
const makeAuth = () => {
  const options: any = createAuthOptions({} as any);
  options.advanced = { ...options.advanced, disableOriginCheck: false };
  return betterAuth(options);
};

const post = (
  auth: ReturnType<typeof makeAuth>,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  auth.handler(
    new Request(`${AUTH_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );

const resetDb = () => {
  for (const table of [
    "user",
    "session",
    "account",
    "verification",
    "rateLimit",
    "apikey",
  ]) {
    h.db[table] = [];
  }
  h.emails.length = 0;
};

const seedVictim = (extra: Record<string, unknown> = {}) => {
  const now = new Date();
  h.db.user.push({
    id: VICTIM.id,
    email: VICTIM.email,
    name: "Victim",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    ...extra,
  });
};

const storedUser = (email: string) =>
  h.db.user.find((user) => user.email === email);

const originalTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;

beforeEach(() => {
  resetDb();
  delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
});

afterEach(() => {
  if (originalTrustedOrigins === undefined) {
    delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  } else {
    process.env.BETTER_AUTH_TRUSTED_ORIGINS = originalTrustedOrigins;
  }
});

describe("F1: magic-link callback origins", () => {
  const attackerUrl = "https://attacker-saveit.vercel.app/steal";

  it("rejects an arbitrary *.vercel.app callbackURL and sends no email", async () => {
    seedVictim();
    const auth = makeAuth();

    const res = await post(auth, "/sign-in/magic-link", {
      email: VICTIM.email,
      callbackURL: attackerUrl,
    });

    expect(res.status).toBe(403);
    expect(h.emails).toHaveLength(0);
  });

  it.each(["newUserCallbackURL", "errorCallbackURL"])(
    "rejects an arbitrary *.vercel.app %s",
    async (field) => {
      seedVictim();
      const auth = makeAuth();

      const res = await post(auth, "/sign-in/magic-link", {
        email: VICTIM.email,
        callbackURL: `${SITE}/app`,
        [field]: attackerUrl,
      });

      expect(res.status).toBe(403);
      expect(h.emails).toHaveLength(0);
    },
  );

  it("keeps the SITE_URL cross-domain flow working end to end", async () => {
    seedVictim();
    const auth = makeAuth();

    const res = await post(auth, "/sign-in/magic-link", {
      email: VICTIM.email,
      callbackURL: `${SITE}/app`,
    });
    expect(res.status).toBe(200);
    expect(h.emails).toHaveLength(1);

    const actionUrl = new URL(h.emails[0].actionUrl);
    const click = await auth.handler(
      new Request(
        `${AUTH_BASE}${actionUrl.pathname.replace(/^\/api\/auth/, "")}${actionUrl.search}`,
      ),
    );
    expect(click.status).toBe(302);
    const location = new URL(click.headers.get("location") ?? "");
    expect(location.host).toBe("saveit.now");
    const ott = location.searchParams.get("ott");
    expect(ott).toBeTruthy();

    const redeem = await post(auth, "/cross-domain/one-time-token/verify", {
      token: ott,
    });
    expect(redeem.status).toBe(200);
    const session = (await redeem.json()) as { user: { id: string } };
    expect(session.user.id).toBe(VICTIM.id);
  });

  it("accepts an explicitly configured preview origin but no other vercel.app host", async () => {
    process.env.BETTER_AUTH_TRUSTED_ORIGINS =
      "https://saveit-now-git-x-codelynx.vercel.app";
    seedVictim();
    const auth = makeAuth();

    const allowed = await post(auth, "/sign-in/magic-link", {
      email: VICTIM.email,
      callbackURL: "https://saveit-now-git-x-codelynx.vercel.app/app",
    });
    expect(allowed.status).toBe(200);
    expect(h.emails).toHaveLength(1);

    const denied = await post(auth, "/sign-in/magic-link", {
      email: VICTIM.email,
      callbackURL: attackerUrl,
    });
    expect(denied.status).toBe(403);
    expect(h.emails).toHaveLength(1);
  });

  it("accepts a relative callbackURL", async () => {
    seedVictim();
    const auth = makeAuth();

    const res = await post(auth, "/sign-in/magic-link", {
      email: VICTIM.email,
      callbackURL: "/app",
    });

    expect(res.status).toBe(200);
    expect(h.emails).toHaveLength(1);
  });
});

describe("F2: server-owned user fields", () => {
  const signIn = async (auth: ReturnType<typeof makeAuth>, email: string) => {
    const send = await post(auth, "/email-otp/send-verification-otp", {
      email,
      type: "sign-in",
    });
    expect(send.status).toBe(200);
    const otp = h.emails.at(-1)?.otp;
    expect(otp).toBeTruthy();

    const res = await post(auth, "/sign-in/email-otp", { email, otp });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    const cookie = setCookie
      .split(/,(?=\s*[^;,]+=)/)
      .map((part) => part.split(";")[0].trim())
      .join("; ");
    expect(cookie).toContain("session_token");
    return { cookie, origin: SITE };
  };

  it.each([
    { stripeCustomerId: "cus_victim" },
    { publicLinkSlug: "Bad Slug!", publicLinkEnabled: true },
    { unsubscribed: true },
  ])("rejects /update-user with %o", async (body) => {
    seedVictim({
      stripeCustomerId: "cus_owner",
      unsubscribed: false,
      publicLinkSlug: "owner-slug",
      publicLinkEnabled: false,
    });
    const auth = makeAuth();
    const headers = await signIn(auth, VICTIM.email);
    const before = { ...storedUser(VICTIM.email) };

    const res = await post(auth, "/update-user", body, headers);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const after = storedUser(VICTIM.email);
    expect(after.stripeCustomerId).toBe(before.stripeCustomerId);
    expect(after.unsubscribed).toBe(before.unsubscribed);
    expect(after.publicLinkSlug).toBe(before.publicLinkSlug);
    expect(after.publicLinkEnabled).toBe(before.publicLinkEnabled);
  });

  it("still lets a user update their name", async () => {
    seedVictim();
    const auth = makeAuth();
    const headers = await signIn(auth, VICTIM.email);

    const res = await post(auth, "/update-user", { name: "New Name" }, headers);

    expect(res.status).toBe(200);
    expect(storedUser(VICTIM.email).name).toBe("New Name");
  });

  it("does not persist stripeCustomerId sent during OTP sign-up", async () => {
    const auth = makeAuth();
    const email = "new-user@example.com";
    const send = await post(auth, "/email-otp/send-verification-otp", {
      email,
      type: "sign-in",
    });
    expect(send.status).toBe(200);
    const otp = h.emails.at(-1)?.otp;

    await post(auth, "/sign-in/email-otp", {
      email,
      otp,
      stripeCustomerId: "cus_victim",
    });

    expect(storedUser(email)?.stripeCustomerId).not.toBe("cus_victim");
  });
});
