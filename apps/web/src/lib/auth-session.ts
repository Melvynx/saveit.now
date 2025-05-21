import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { auth } from "./auth"; // path to your Better Auth server instance
import { getAuthLimits } from "./auth-limits";

export const getUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
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

  const subscriptions = await auth.api.listActiveSubscriptions({
    headers: await headers(),
  });
  const subscription = subscriptions[0];

  const limits = getAuthLimits(subscription);

  return {
    ...user,
    limits,
    plan: (subscription?.plan ?? "free") as "free" | "pro",
  };
};
