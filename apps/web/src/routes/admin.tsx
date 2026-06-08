import { AdminFilters } from "@/features/admin/admin-filters";
import { parseAdminSearchParams } from "@/features/admin/search-params";
import { UserTable } from "@/features/admin/user-table";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Typography } from "@workspace/ui/components/typography";
import { Mail, MessageSquareIcon, Users } from "lucide-react";
import { Suspense } from "react";

const getAdminData = createServerFn({ method: "GET" })
  .validator((data: ReturnType<typeof parseAdminSearchParams>) => data)
  .handler(async ({ data }) => {
    const [{ getRequiredUserOrRedirect }, { getUsersWithStats }] =
      await Promise.all([
      import("@/lib/auth-session"),
      import("@/lib/database/admin-users"),
    ]);
    const user = await getRequiredUserOrRedirect();
    if (user.role !== "admin") {
      throw new Response("Not found", { status: 404 });
    }

    const pageSize = 10;
    const usersData = await getUsersWithStats({
      page: data.page,
      pageSize,
      search: data.search || undefined,
      sortBy: data.sortBy,
      order: data.order,
      filter: data.filter,
    });

    return { searchParams: data, ...usersData };
  });

export const Route = createFileRoute("/admin")({
  validateSearch: parseAdminSearchParams,
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ deps }) => getAdminData({ data: deps.search }),
  component: AdminPage,
});

function AdminPage() {
  const { searchParams, users, total, totalPages } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <Typography variant="h1">Admin Panel</Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <a href="/admin/conversations">
              <MessageSquareIcon className="size-4" />
              Conversations
            </a>
          </Button>
          <Button className="flex items-center gap-2" asChild>
            <a href="/admin/send-email">
              <Mail className="size-4" />
              Send Marketing Email
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage users, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminFilters searchParams={searchParams} />
          <Suspense fallback={<UserTableSkeleton />}>
            <UserTable
              searchParams={searchParams}
              users={users}
              total={total}
              totalPages={totalPages}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

const UserTableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 10 }).map((_, index) => (
      <Skeleton key={index} className="h-16 w-full" />
    ))}
  </div>
);
