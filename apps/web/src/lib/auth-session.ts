import { prisma } from "@workspace/database";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { auth } from "./auth";
import { getAuthLimits, parseCustomAuthLimits } from "./auth-limits";
import { getUserMetadata } from "./database/user-metadata.utils";

export const getUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user;
};

export const getRequiredUser = async () => {
  const user = await getUser();

  if (!user) unauthorized();

  return user;
};

export const getUserLimits = async () => {
  const user = await getRequiredUser();

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
