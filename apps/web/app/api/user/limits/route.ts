import { getAuthLimits } from "@/lib/auth-limits";
import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";

export const GET = userRoute.handler(async (_, { ctx }) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      referenceId: ctx.user.id,
      status: { in: ["active", "trialing"] },
    },
  });

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
