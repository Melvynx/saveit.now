import { AdminShell } from "@/features/admin/admin-shell";
import { AdminPageHeader, AdminStatCard } from "@/features/admin/admin-shared";
import { parseAdminSearchParams } from "@/features/admin/search-params";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Navigate,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Ban,
  Bookmark,
  Crown,
  Mail,
  MessageSquareText,
  MousePointerClick,
  ShieldCheck,
  Users,
} from "lucide-react";

const getAdminData = createServerFn({ method: "GET" })
  .validator((data: ReturnType<typeof parseAdminSearchParams>) => data)
  .handler(async () => {
    const { getUser } = await import("@/lib/auth-session");
    const user = await getUser();
    if (!user) {
      return { access: "signed-out" as const };
    }

    if (user.role !== "admin") {
      return { access: "forbidden" as const };
    }

    const overview = await fetchAuthQuery(api.admin.queries.getOverview, {});

    return {
      access: "granted" as const,
      overview,
    };
  });

export const Route = createFileRoute("/admin")({
  validateSearch: parseAdminSearchParams,
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ deps }) => getAdminData({ data: deps.search }),
  component: AdminPage,
});

function AdminPage() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const data = Route.useLoaderData();

  if (data.access === "signed-out") {
    return <Navigate to="/signin" />;
  }

  if (data.access === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            This area is only available to SaveIt.now administrators.
          </p>
        </div>
      </div>
    );
  }

  const { overview } = data;

  if (pathname !== "/admin") {
    return (
      <AdminShell pathname={pathname}>
        <Outlet />
      </AdminShell>
    );
  }

  return (
    <AdminShell pathname={pathname}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AdminPageHeader
          title="Dashboard"
          description="Operational view for users, subscriptions, limits, conversations, and marketing."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <a href="/admin/users">
                  <Users className="size-4" />
                  Users
                </a>
              </Button>
              <Button asChild>
                <a href="/admin/conversations">
                  <MessageSquareText className="size-4" />
                  Feedback
                </a>
              </Button>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            title="Users"
            value={overview.totalUsers.toLocaleString()}
            description={`${overview.activeUsers.toLocaleString()} active accounts`}
            icon={Users}
          />
          <AdminStatCard
            title="Premium"
            value={overview.premiumUsers.toLocaleString()}
            description={`${overview.regularUsers.toLocaleString()} regular users`}
            icon={Crown}
          />
          <AdminStatCard
            title="Bookmarks"
            value={overview.totalBookmarks.toLocaleString()}
            description="Total saved links"
            icon={Bookmark}
          />
          <AdminStatCard
            title="Clicks"
            value={overview.totalClicks.toLocaleString()}
            description="Total bookmark opens"
            icon={MousePointerClick}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <AdminStatCard
            title="Admins"
            value={overview.adminUsers.toLocaleString()}
            description="Users with admin role"
            icon={ShieldCheck}
          />
          <AdminStatCard
            title="Banned"
            value={overview.bannedUsers.toLocaleString()}
            description="Restricted accounts"
            icon={Ban}
          />
          <AdminStatCard
            title="Email audience"
            value={overview.marketingEligibleUsers.toLocaleString()}
            description="Eligible marketing recipients"
            icon={Mail}
          />
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Admin workflow</CardTitle>
              <CardDescription>
                Jump to the operational queues that need human handling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AdminWorkflowLink
                href="/admin/users"
                icon={Users}
                title="User management"
                description="Search users, inspect plans, manage access, and open custom limits."
              />
              <AdminWorkflowLink
                href="/admin/conversations"
                icon={MessageSquareText}
                title="Conversation feedback"
                description="Review liked and disliked AI conversations."
              />
              <AdminWorkflowLink
                href="/admin/send-email"
                icon={Mail}
                title="Marketing email"
                description="Compose a campaign for subscribed users."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick checks</CardTitle>
              <CardDescription>
                High-level account signals before opening a queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DashboardSignal
                label="Active accounts"
                value={overview.activeUsers}
              />
              <DashboardSignal
                label="Premium users"
                value={overview.premiumUsers}
              />
              <DashboardSignal
                label="Banned users"
                value={overview.bannedUsers}
              />
              <DashboardSignal
                label="Marketing audience"
                value={overview.marketingEligibleUsers}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

function DashboardSignal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value.toLocaleString()}</span>
    </div>
  );
}

function AdminWorkflowLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Mail;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="hover:bg-muted flex items-start gap-3 rounded-lg border p-3 transition-colors"
    >
      <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </div>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block text-xs">
          {description}
        </span>
      </span>
    </a>
  );
}
