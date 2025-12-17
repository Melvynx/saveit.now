import { getAuthLimits } from "@/lib/auth-limits";
import { auth } from "@/lib/auth";
import { userRoute } from "@/lib/safe-route";
import { headers } from "next/headers";

export const GET = userRoute.handler(async () => {
  const subscriptions = await auth.api.listActiveSubscriptions({
    headers: await headers(),
  });

  const subscription = subscriptions[0];
  const limits = getAuthLimits(subscription);
  const plan = (subscription?.plan ?? "free") as "free" | "pro";

  return {
    plan,
    limits,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          periodEnd: subscription.periodEnd,
        }
      : null,
  };
});
