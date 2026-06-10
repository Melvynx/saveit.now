import { AdminFilters } from "@/features/admin/admin-filters";
import {
  AdminPageHeader,
  AdminTableSkeleton,
} from "@/features/admin/admin-shared";
import { parseAdminSearchParams } from "@/features/admin/search-params";
import { useSession } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import { createFileRoute, Navigate } from "@tanstack/react-router";
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
import { useAuthedQuery } from "@/hooks/use-authed-query";

export const Route = createFileRoute("/admin/users")({
  validateSearch: parseAdminSearchParams,
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const session = useSession();
  const searchParams = Route.useSearch();
  const role = (session.data?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin";
  const pageSize = 10;
  const usersData = useAuthedQuery(
    api.admin.queries.listUsers,
    isAdmin
      ? {
          page: searchParams.page,
          pageSize,
          search: searchParams.search || undefined,
          sortBy: searchParams.sortBy,
          order: searchParams.order,
          filter:
            searchParams.filter !== "all" ? searchParams.filter : undefined,
          status:
            searchParams.status !== "all" ? searchParams.status : undefined,
          role: searchParams.role !== "all" ? searchParams.role : undefined,
        }
      : "skip",
  );

  if (session.isPending) return null;
  if (!session.data?.user) return <Navigate to="/signin" />;
  if (!isAdmin) return null;
  if (!usersData) return null;

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
              users={usersData.users}
              total={usersData.total}
              totalPages={usersData.totalPages}
              pageSize={pageSize}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
