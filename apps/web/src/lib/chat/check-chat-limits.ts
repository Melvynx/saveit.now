import { prisma } from "@workspace/database";
import dayjs from "dayjs";
import { getAuthLimits } from "../auth-limits";
import { SafeRouteError } from "../errors";

export type ChatUsageResult = {
  used: number;
  limit: number;
  remaining: number;
  plan: string;
};

export const getChatUsage = async (
  userId: string,
): Promise<ChatUsageResult> => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      referenceId: userId,
      status: { in: ["active", "trialing"] },
    },
  });

  const plan = subscription?.plan ?? "free";
  const limits = getAuthLimits(subscription);

  const startOfMonth = dayjs().startOf("month");
  const used = await prisma.chatUsage.count({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth.toDate(),
      },
    },
  });

  return {
    used,
    limit: limits.monthlyChatQueries,
    remaining: Math.max(0, limits.monthlyChatQueries - used),
    plan,
  };
};

export const checkChatLimit = async (userId: string): Promise<void> => {
  const usage = await getChatUsage(userId);

  if (usage.remaining <= 0) {
    throw new SafeRouteError(
      `Chat limit reached. You've used ${usage.used}/${usage.limit} queries this month. Upgrade to Pro for more.`,
      429,
    );
  }
};

export const checkAndIncrementChatUsage = async (
  userId: string,
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const startOfMonth = dayjs().startOf("month");
    const used = await tx.chatUsage.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth.toDate() },
      },
    });

    const subscription = await tx.subscription.findFirst({
      where: {
        referenceId: userId,
        status: { in: ["active", "trialing"] },
      },
    });

    const limits = getAuthLimits(subscription);

    if (used >= limits.monthlyChatQueries) {
      throw new SafeRouteError(
        `Chat limit reached. You've used ${used}/${limits.monthlyChatQueries} queries this month.`,
        429,
      );
    }

    await tx.chatUsage.create({ data: { userId } });
  });
};

export const incrementChatUsage = async (userId: string): Promise<void> => {
  await prisma.chatUsage.create({
    data: {
      userId,
    },
  });
};
