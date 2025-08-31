import { prisma } from "@workspace/database";

export interface MarketingEligibleUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getMarketingEligibleUsers(): Promise<MarketingEligibleUser[]> {
  const users = await prisma.user.findMany({
    where: {
      unsubscribed: false,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return users.filter((user: { id: string; email: string | null; name: string | null }): user is MarketingEligibleUser => !!user.email);
}

export async function getMarketingEligibleUsersCount(): Promise<number> {
  const users = await prisma.user.findMany({
    where: {
      unsubscribed: false,
    },
    select: {
      email: true,
    },
  });

  return users.filter((user: { email: string | null }) => !!user.email).length;
}