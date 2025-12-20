import { prisma } from "@workspace/database";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { auth } from "./auth";
import { getAuthLimits } from "./auth-limits";

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

  const limits = getAuthLimits(subscription);

  return {
    ...user,
    limits,
    plan: (subscription?.plan ?? "free") as "free" | "pro",
  };
};
