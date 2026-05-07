import { getAuthLimits, parseCustomAuthLimits } from "@/lib/auth-limits";
import { getUserMetadata } from "@/lib/database/user-metadata.utils";
import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";

export const GET = userRoute.handler(async (_, { ctx }) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      referenceId: ctx.user.id,
      status: { in: ["active", "trialing"] },
    },
  });

  const metadata = await getUserMetadata(ctx.user.id);
  const limits = getAuthLimits(subscription, metadata);
  const plan = (subscription?.plan ?? "free") as "free" | "pro";

  return {
    plan,
    limits,
    customLimits: parseCustomAuthLimits(metadata),
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          periodEnd: subscription.periodEnd,
        }
      : null,
  };
});
