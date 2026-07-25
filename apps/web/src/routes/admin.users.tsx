import { AdminFilters } from "@/features/admin/admin-filters";
import {
  AdminPageHeader,
  AdminScanNotice,
  AdminTableSkeleton,
} from "@/features/admin/admin-shared";
import { parseAdminSearchParams } from "@/features/admin/search-params";
import { USER_TABLE_HEADERS, UserTable } from "@/features/admin/user-table";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useStableQuery } from "@/hooks/use-stable-query";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Users } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  validateSearch: parseAdminSearchParams,
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const searchParams = Route.useSearch();

  const usersQuery = useStableQuery(
    useAuthedQuery(api.admin.queries.listUsers, {
      page: searchParams.page,
      pageSize: searchParams.pageSize,
      search: searchParams.search || undefined,
      sortBy: searchParams.sortBy,
      order: searchParams.order,
      filter: searchParams.filter !== "all" ? searchParams.filter : undefined,
      status: searchParams.status !== "all" ? searchParams.status : undefined,
      role: searchParams.role !== "all" ? searchParams.role : undefined,
    }),
  );
  const usersData = usersQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Users"
        description={
          usersData
            ? `${usersData.total.toLocaleString()} account${usersData.total === 1 ? "" : "s"} matching the current filters.`
            : "Search users, inspect plans, manage access, and open custom limits."
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" />
            User management
          </CardTitle>
          <CardDescription>
            Filter by plan, status, role, usage, and account creation. Click any
            row to open the full account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminFilters searchParams={searchParams} />

          {/* Skeleton only on the very first load — every later navigation keeps
              the previous rows on screen and dims them while refetching. */}
          {!usersData ? (
            <AdminTableSkeleton
              headers={USER_TABLE_HEADERS}
              rows={Math.min(searchParams.pageSize, 10)}
            />
          ) : (
            <>
              <UserTable
                searchParams={searchParams}
                users={usersData.users}
                total={usersData.total}
                totalPages={usersData.totalPages}
                pageSize={usersData.pageSize}
                isStale={usersQuery.isStale}
              />
              <AdminScanNotice
                capped={usersData.scan.capped}
                limit={usersData.scan.limit}
                noun="user accounts"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
