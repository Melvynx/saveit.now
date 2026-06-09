import { CustomLimitsForm } from "@/features/admin/custom-limits-form";
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
} from "@/features/admin/admin-shared";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Bookmark, MousePointerClick, UserCog, Users } from "lucide-react";

const getAdminUserData = createServerFn({ method: "GET" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const { getUser } = await import("@/lib/auth-session");
    const user = await getUser();
    if (!user) {
      return { access: "signed-out" as const };
    }

    if (user.role !== "admin") {
      return { access: "forbidden" as const };
    }

    const userDetail = await fetchAuthQuery(api.admin.queries.getUserDetail, {
      userId: data.userId,
    });

    if (!userDetail) {
      return { access: "not-found" as const };
    }

    return {
      access: "granted" as const,
      userDetail,
    };
  });

export const Route = createFileRoute("/admin/users/$userId")({
  loader: ({ params }) => getAdminUserData({ data: params }),
  component: AdminUserPage,
});

function AdminUserPage() {
  const data = Route.useLoaderData();
  if (data.access === "signed-out") return <Navigate to="/signin" />;
  if (data.access === "forbidden") return null;
  if (data.access === "not-found") {
    return <p className="text-muted-foreground">User not found.</p>;
  }

  const { userDetail } = data;
  const { bookmarkCount, clickCount, baseLimits, customLimits, effectiveLimits } = userDetail;
  const isPremium = baseLimits.bookmarks > 20;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <AdminPageHeader
        title={userDetail.name || userDetail.email || userDetail.id}
        description={userDetail.email ?? undefined}
        action={
          <AdminStatusBadge value={userDetail.banned ? "banned" : "active"} />
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          title="Bookmarks"
          value={bookmarkCount.toLocaleString()}
          description="Saved links"
          icon={Bookmark}
        />
        <AdminStatCard
          title="Clicks"
          value={clickCount.toLocaleString()}
          description="Bookmark opens"
          icon={MousePointerClick}
        />
        <AdminStatCard
          title="Plan"
          value={isPremium ? "Premium" : "Regular"}
          description={`${effectiveLimits.bookmarks} bookmark limit`}
          icon={Users}
        />
      </section>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="size-4" />
            User profile
          </CardTitle>
          <CardDescription>
            Account identity and operational support context.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <UserDetail label="User ID" value={userDetail.id} />
          <UserDetail label="Role" value={userDetail.role || "user"} />
          <UserDetail
            label="Email verified"
            value={userDetail.emailVerified ? "Yes" : "No"}
          />
          <UserDetail
            label="Created"
            value={new Date(userDetail.createdAt).toLocaleString()}
          />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Public link</span>
            <Badge
              variant={userDetail.publicLinkEnabled ? "default" : "outline"}
            >
              {userDetail.publicLinkEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardContent>
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
            userId={userDetail.id}
            baseLimits={baseLimits}
            effectiveLimits={effectiveLimits}
            customLimits={customLimits}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function UserDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}
