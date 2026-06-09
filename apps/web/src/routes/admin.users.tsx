import { AdminFilters } from "@/features/admin/admin-filters";
import {
  AdminPageHeader,
  AdminTableSkeleton,
} from "@/features/admin/admin-shared";
import { parseAdminSearchParams } from "@/features/admin/search-params";
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
import { Users } from "lucide-react";
import { Suspense } from "react";
import { UserTable } from "@/features/admin/user-table";

const getAdminUsersData = createServerFn({ method: "GET" })
  .validator((data: ReturnType<typeof parseAdminSearchParams>) => data)
  .handler(async ({ data }) => {
    const { getUser } = await import("@/lib/auth-session");
    const user = await getUser();
    if (!user) {
      return { access: "signed-out" as const };
    }

    if (user.role !== "admin") {
      return { access: "forbidden" as const };
    }

    const pageSize = 10;
    const usersData = await fetchAuthQuery(api.admin.queries.listUsers, {
      page: data.page,
      pageSize,
      search: data.search || undefined,
      sortBy: data.sortBy,
      order: data.order,
      filter: data.filter !== "all" ? data.filter : undefined,
      status: data.status !== "all" ? data.status : undefined,
      role: data.role !== "all" ? data.role : undefined,
    });

    return {
      access: "granted" as const,
      pageSize,
      searchParams: data,
      users: usersData.users,
      total: usersData.total,
      totalPages: usersData.totalPages,
    };
  });

export const Route = createFileRoute("/admin/users")({
  validateSearch: parseAdminSearchParams,
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ deps }) => getAdminUsersData({ data: deps.search }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const data = Route.useLoaderData();
  if (data.access === "signed-out") return <Navigate to="/signin" />;
  if (data.access === "forbidden") return null;

  const { pageSize, searchParams, users, total, totalPages } = data;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <AdminPageHeader
        title="Users"
        description="Search users, inspect plans, manage access, and open custom limits."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" />
            User management
          </CardTitle>
          <CardDescription>
            Filter by plan, status, role, usage, and account creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminFilters searchParams={searchParams} />
          <Suspense
            fallback={
              <AdminTableSkeleton
                headers={[
                  "User",
                  "Role",
                  "Status",
                  "Plan",
                  "Usage",
                  "Created",
                  "Actions",
                ]}
                rows={pageSize}
              />
            }
          >
            <UserTable
              searchParams={searchParams}
              users={users}
              total={total}
              totalPages={totalPages}
              pageSize={pageSize}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
