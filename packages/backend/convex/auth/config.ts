import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireRunMutationCtx } from "@convex-dev/better-auth/utils";
import { apiKey } from "@better-auth/api-key";
import { expo } from "@better-auth/expo";
import { APIError, betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin, emailOTP, magicLink, oneTimeToken } from "better-auth/plugins";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import authConfig from "../auth.config";
import betterAuthSchema from "../betterAuth/schema";
import { throwForbidden, throwUnauthorized } from "../utils/errors";

const APP_NAME = "SaveIt";
export const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
export const authCookiePrefix =
  process.env.BETTER_AUTH_COOKIE_PREFIX?.trim() || "save-it";
const appStoreTestEmail = "help@saveit.now";
const appStoreTestOtp = "123456";

const hashEmailForRateLimit = async (email: string) => {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

const isAppStoreTestLogin = (email: string) => {
  return email.trim().toLowerCase() === appStoreTestEmail;
};

// --- Origin / host helpers (Phase 17 B9: accept preview deploys) ---

const normalizeOrigin = (origin: string) => {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
};

const getSiteHost = () => {
  try {
    return new URL(siteUrl).host;
  } catch {
    return null;
  }
};

const configuredTrustedOrigins = () =>
  (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const getAllowedHosts = () => {
  const configuredHosts = configuredTrustedOrigins()
    .map((value) => normalizeOrigin(value))
    .map((origin) => (origin ? new URL(origin).host : null))
    .filter((host): host is string => Boolean(host));

  return Array.from(
    new Set(
      [
        "localhost:*",
        "127.0.0.1:*",
        "[::1]:*",
        "*.vercel.app",
        getSiteHost(),
        ...configuredHosts,
      ].filter((host): host is string => Boolean(host)),
    ),
  );
};

const getTrustedOrigins = () => {
  const configured = configuredTrustedOrigins()
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));

  return Array.from(
    new Set([
      ...(normalizeOrigin(siteUrl) ? [normalizeOrigin(siteUrl) as string] : []),
      // mobile + Expo
      "saveit://",
      "exp://",
      // browser extensions
      "chrome-extension://*",
      "moz-extension://*",
      // Apple sign-in
      "https://appleid.apple.com",
      ...configured,
    ]),
  );
};

export const authComponent = createClient<DataModel, typeof betterAuthSchema>(
  components.betterAuth,
  {
    local: { schema: betterAuthSchema },
    verbose: false,
  },
);

// --- Email scheduling (real senders wired in Phase 10) ---
type ScheduleEmailParams = {
  to: string;
  subject: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  preview?: string;
  otp?: string;
};

const scheduleEmail = async (
  ctx: GenericCtx<DataModel>,
  params: ScheduleEmailParams,
) => {
  try {
    const mctx = requireRunMutationCtx(ctx);
    await mctx.scheduler.runAfter(
      0,
      internal.email.actions.sendAuthEmail,
      params,
    );
  } catch (error) {
    // During early bootstrap the email action may not exist yet; never block auth.
    console.warn("[auth] scheduleEmail failed", error);
  }
};

type SocialProvidersType = Parameters<typeof betterAuth>[0]["socialProviders"];

export const getSocialProviders = (): SocialProvidersType => {
  const providers: SocialProvidersType = {};
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    providers.apple = {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
    };
  }
  return providers;
};

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => ({
  baseURL: {
    allowedHosts: getAllowedHosts(),
    fallback: siteUrl,
    protocol: "auto" as const,
  },
  trustedOrigins: getTrustedOrigins(),
  database: authComponent.adapter(ctx),
  rateLimit: {
    enabled: true,
    storage: "database" as const,
    window: 60,
    max: 100,
    customRules: {
      "/email-otp/send-verification-otp": {
        window: 60,
        max: 3,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (requestContext) => {
      if (
        requestContext.path !== "/email-otp/send-verification-otp" ||
        typeof requestContext.body?.email !== "string"
      ) {
        return;
      }

      const email = requestContext.body.email.trim().toLowerCase();
      // The fixed App Store review credential never sends email and therefore
      // cannot be used for email bombing.
      if (isAppStoreTestLogin(email)) return;

      const mctx = requireRunMutationCtx(ctx);
      const result = await mctx.runMutation(
        internal.auth.rateLimit.consumeEmailOtpSend,
        { emailHash: await hashEmailForRateLimit(email) },
      );

      if (!result.allowed) {
        throw APIError.fromStatus("TOO_MANY_REQUESTS", {
          message: "Too many sign-in code requests. Please try again later.",
        });
      }
    }),
  },
  session: {
    // parity with current SaveIt config: 400-day sessions, refresh daily
    expiresIn: 60 * 60 * 24 * 400,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookiePrefix: authCookiePrefix,
  },
  account: {
    accountLinking: { enabled: true },
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: getSocialProviders(),
  // REQUIRED so custom user fields are returned (typed) on getSession().user
  user: {
    additionalFields: {
      stripeCustomerId: { type: "string" as const, required: false },
      onboarding: {
        type: "boolean" as const,
        required: false,
        defaultValue: false,
        input: false,
      },
      onboardingUpgradeChoice: {
        type: "string" as const,
        required: false,
        input: false,
      },
      unsubscribed: { type: "boolean" as const, required: false },
      publicLinkSlug: { type: "string" as const, required: false },
      publicLinkEnabled: { type: "boolean" as const, required: false },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user: { id: string }) => {
        try {
          const mctx = requireRunMutationCtx(ctx);
          await mctx.scheduler.runAfter(
            0,
            internal.stripe.actions.cancelAllForUser,
            { userId: user.id },
          );
        } catch (error) {
          console.warn("[auth] beforeDelete hook skipped", error);
        }
      },
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }) => {
      await scheduleEmail(ctx, {
        to: user.email,
        subject: `Verify your ${APP_NAME} email address`,
        title: "Verify your email address",
        description: `Welcome to ${APP_NAME}. Use the secure link below to verify your email address.`,
        actionLabel: "Verify email",
        actionUrl: url,
        preview: `Verify your ${APP_NAME} email address.`,
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user: { id: string; email: string }) => {
          try {
            const mctx = requireRunMutationCtx(ctx);
            await mctx.scheduler.runAfter(
              0,
              internal.auth.hooks.onUserCreated,
              { userId: user.id },
            );
          } catch (error) {
            console.warn("[auth] user.create.after hook skipped", error);
          }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      generateOTP: ({ email }: { email: string }) => {
        if (isAppStoreTestLogin(email)) {
          return appStoreTestOtp;
        }
        return undefined as unknown as string;
      },
      sendVerificationOTP: async ({
        email,
        otp,
      }: {
        email: string;
        otp: string;
      }) => {
        // Phase 17 B10: store-review test account skips the email.
        if (isAppStoreTestLogin(email)) return;
        await scheduleEmail(ctx, {
          to: email,
          subject: `Your ${APP_NAME} sign-in code`,
          title: "Your sign-in code",
          description: `Use this one-time code to sign in to ${APP_NAME}.`,
          preview: `Your ${APP_NAME} sign-in code is ${otp}.`,
          otp,
        });
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
        await scheduleEmail(ctx, {
          to: email,
          subject: `Sign in to ${APP_NAME}`,
          title: `Sign in to ${APP_NAME}`,
          description: "Use the secure link below to sign in.",
          actionLabel: "Sign in",
          actionUrl: url,
          preview: `Open this secure link to sign in to ${APP_NAME}.`,
        });
      },
    }),
    admin({
      bannedUserMessage:
        "This account has been banned and can no longer access the app.",
    }),
    apiKey({
      defaultPrefix: "saveit_",
      rateLimit: { enabled: false },
    }),
    oneTimeToken(),
    expo(),
    crossDomain({ siteUrl }),
    // convex() MUST be the last plugin.
    convex({ authConfig }),
  ],
});

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

type AuthCtx = QueryCtx | MutationCtx | ActionCtx;

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banExpires?: number | null;
  stripeCustomerId?: string | null;
  onboarding?: boolean | null;
  onboardingUpgradeChoice?: "free" | "upgrade" | null;
  unsubscribed?: boolean | null;
  publicLinkSlug?: string | null;
  publicLinkEnabled?: boolean | null;
  emailVerified?: boolean;
};

export async function requireAuth(ctx: AuthCtx) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    throwUnauthorized();
  }

  // Phase 17 B2: block banned users at the function layer, not just the client.
  const user = session.user as unknown as AuthedUser;
  if (
    user.banned === true &&
    (!user.banExpires || user.banExpires > Date.now())
  ) {
    throwForbidden("Account banned");
  }

  return { auth, headers, session, user };
}

export async function requireAdmin(ctx: AuthCtx) {
  const result = await requireAuth(ctx);
  if (result.user.role !== "admin") {
    throwForbidden("Admin access required");
  }
  return result;
}
