import { prisma } from "@workspace/database/client";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { auth } from "./auth";
import { getAuthLimits, parseCustomAuthLimits } from "./auth-limits";
import { getUserMetadata } from "./database/user-metadata.utils";

export const getUser = async () => {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  return session?.user;
};

export const getRequiredUser = async () => {
  const user = await getUser();

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return user;
};

const getLimitsForUser = async (user: Awaited<ReturnType<typeof getUser>>) => {
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const subscription = await prisma.subscription.findFirst({
    where: {
      referenceId: user.id,
      status: { in: ["active", "trialing"] },
    },
  });

  const metadata = await getUserMetadata(user.id);
  const limits = getAuthLimits(subscription, metadata);

  return {
    ...user,
    limits,
    customLimits: parseCustomAuthLimits(metadata),
    plan: (subscription?.plan ?? "free") as "free" | "pro",
  };
};

export const getRequiredUserOrRedirect = async () => {
  const user = await getUser();

  if (!user) {
    throw redirect({ to: "/signin" });
  }

  return user;
};

export const getUserLimits = async () => {
  const user = await getRequiredUser();
  return getLimitsForUser(user);
};

export const getUserLimitsOrRedirect = async () => {
  const user = await getRequiredUserOrRedirect();
  return getLimitsForUser(user);
};
