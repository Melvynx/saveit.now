import { getRequiredUser } from "@/lib/auth-session";
import { getAuthLimits, parseCustomAuthLimits } from "@/lib/auth-limits";
import { prisma } from "@workspace/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Users } from "lucide-react";
import { notFound } from "next/navigation";
import { CustomLimitsForm } from "./custom-limits-form";

export default async function RoutePage(props: {
  params: Promise<{ userId: string }>;
}) {
  const params = await props.params;
  const user = await getRequiredUser();
  if (user.role !== "admin") {
    notFound();
  }

  const bookmarks = await prisma.bookmark.count({
    where: {
      userId: params.userId,
    },
  });

  const clickCount = await prisma.bookmarkOpen.count({
    where: {
      userId: params.userId,
    },
  });

  const userData = await prisma.user.findUnique({
    where: {
      id: params.userId,
    },
  });

  if (!userData) {
    notFound();
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      referenceId: params.userId,
      status: { in: ["active", "trialing"] },
    },
  });
  const baseLimits = getAuthLimits(subscription);
  const customLimits = parseCustomAuthLimits(userData.metadata);
  const effectiveLimits = getAuthLimits(subscription, userData.metadata);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="size-6" />
        <Typography variant="h1">User {userData.email}</Typography>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User {userData.email}</CardTitle>
          <CardDescription>
            User {userData.email} has {bookmarks} bookmarks and {clickCount}
            clicks
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom limits</CardTitle>
          <CardDescription>
            Override this user's plan limits without changing their Stripe plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomLimitsForm
            userId={userData.id}
            baseLimits={baseLimits}
            effectiveLimits={effectiveLimits}
            customLimits={customLimits}
          />
        </CardContent>
      </Card>
    </div>
  );
}
