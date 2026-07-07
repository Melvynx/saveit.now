import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { redirect } from "@tanstack/react-router";

/**
 * SSR auth helpers sourced entirely from Convex (Better Auth on Convex).
 * Function names are kept stable so every
 * route loader / beforeLoad guard keeps working after the data-layer swap.
 */

export type SsrUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: boolean;
  role?: string | null;
  banned?: boolean | null;
  banExpires?: number | null;
  stripeCustomerId?: string | null;
  onboarding?: boolean | null;
  unsubscribed?: boolean | null;
  publicLinkSlug?: string | null;
  publicLinkEnabled?: boolean | null;
};

export const getUser = async (): Promise<SsrUser | undefined> => {
  try {
    const session = await fetchAuthQuery(api.auth.queries.getSession);
    return (session?.user as SsrUser | undefined) ?? undefined;
  } catch {
    return undefined;
  }
};

export const getRequiredUser = async (): Promise<SsrUser> => {
  const user = await getUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
};

export const getRequiredUserOrRedirect = async (): Promise<SsrUser> => {
  const user = await getUser();
  if (!user) {
    throw redirect({ to: "/signin" });
  }
  return user;
};

const getLimitsForUser = async (user: SsrUser) => {
  const limits = await fetchAuthQuery(api.users.queries.getLimits);
  return {
    ...user,
    limits: limits.limits,
    customLimits: limits.customLimits,
    plan: limits.plan,
  };
};

export const getUserLimits = async () => {
  const user = await getRequiredUser();
  return getLimitsForUser(user);
};

export const getUserLimitsOrRedirect = async () => {
  const user = await getRequiredUserOrRedirect();
  return getLimitsForUser(user);
};
