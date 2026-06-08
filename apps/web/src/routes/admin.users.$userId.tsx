import { CustomLimitsForm } from "@/features/admin/custom-limits-form";
import { getAuthLimits, parseCustomAuthLimits } from "@/lib/auth-limits";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Users } from "lucide-react";

const getAdminUserData = createServerFn({ method: "GET" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const [{ getRequiredUserOrRedirect }, { prisma }] = await Promise.all([
      import("@/lib/auth-session"),
      import("@workspace/database/client"),
    ]);
    const user = await getRequiredUserOrRedirect();
    if (user.role !== "admin") {
      throw new Response("Not found", { status: 404 });
    }

    const [bookmarks, clickCount, userData, subscription] = await Promise.all([
      prisma.bookmark.count({ where: { userId: data.userId } }),
      prisma.bookmarkOpen.count({ where: { userId: data.userId } }),
      prisma.user.findUnique({ where: { id: data.userId } }),
      prisma.subscription.findFirst({
        where: {
          referenceId: data.userId,
          status: { in: ["active", "trialing"] },
        },
      }),
    ]);

    if (!userData) {
      throw new Response("Not found", { status: 404 });
    }

    const baseLimits = getAuthLimits(subscription);
    const customLimits = parseCustomAuthLimits(userData.metadata);
    const effectiveLimits = getAuthLimits(subscription, userData.metadata);

    return {
      bookmarks,
      clickCount,
      userData,
      baseLimits,
      customLimits,
      effectiveLimits,
    };
  });

export const Route = createFileRoute("/admin/users/$userId")({
  loader: ({ params }) => getAdminUserData({ data: params }),
  component: AdminUserPage,
});

function AdminUserPage() {
  const {
    bookmarks,
    clickCount,
    userData,
    baseLimits,
    customLimits,
    effectiveLimits,
  } = Route.useLoaderData();

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
            User {userData.email} has {bookmarks} bookmarks and {clickCount}{" "}
            clicks
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Custom limits</CardTitle>
          <CardDescription>
            Override custom plan limits without changing their Stripe plan.
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
