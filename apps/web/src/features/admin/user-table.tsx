import { AdminEmptyState } from "@/features/admin/admin-shared";
import type { AdminUserListItem } from "@/features/admin/types";
import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowDown, ArrowUp, ChevronsUpDown, UserX } from "lucide-react";
import type { ReactNode } from "react";
import { AdminPagination } from "./admin-pagination";
import type { AdminSearchParams, SortBy } from "./search-params";
import { nextAdminSearch } from "./search-params";
import { UserRow } from "./user-row";

export const USER_TABLE_HEADERS = [
  "User",
  "Role",
  "Status",
  "Plan",
  "Usage",
  "Created",
  "Actions",
];

type UserTableProps = {
  searchParams: AdminSearchParams;
  users: AdminUserListItem[];
  total: number;
  totalPages: number;
  pageSize: number;
  isStale?: boolean;
};

export const UserTable = ({
  searchParams,
  users,
  total,
  totalPages,
  pageSize,
  isStale = false,
}: UserTableProps) => {
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "overflow-hidden rounded-lg border transition-opacity duration-200",
          isStale && "opacity-60",
        )}
        aria-busy={isStale}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead sortBy="name" searchParams={searchParams}>
                User
              </SortableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <SortableHead sortBy="bookmarks" searchParams={searchParams}>
                Usage
              </SortableHead>
              <SortableHead sortBy="createdAt" searchParams={searchParams}>
                Created
              </SortableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => <UserRow key={user.id} user={user} />)
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  <AdminEmptyState
                    icon={UserX}
                    title="No users match these filters"
                    description="Try clearing the search box or resetting the plan, status and role filters."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AdminPagination
        currentPage={searchParams.page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        searchParams={searchParams}
      />
    </div>
  );
};

/**
 * Column header that toggles sort direction through the URL, so sorting is
 * shareable, back-button friendly and preloadable like any other navigation.
 */
function SortableHead({
  sortBy,
  searchParams,
  children,
  className,
}: {
  sortBy: SortBy;
  searchParams: AdminSearchParams;
  children: ReactNode;
  className?: string;
}) {
  const isActive = searchParams.sortBy === sortBy;
  const nextOrder = isActive && searchParams.order === "desc" ? "asc" : "desc";
  const Icon = !isActive
    ? ChevronsUpDown
    : searchParams.order === "desc"
      ? ArrowDown
      : ArrowUp;

  return (
    <TableHead
      className={className}
      aria-sort={
        isActive
          ? searchParams.order === "desc"
            ? "descending"
            : "ascending"
          : "none"
      }
    >
      <Link
        to="/admin/users"
        search={nextAdminSearch(searchParams, {
          sortBy,
          order: nextOrder,
          page: 1,
        })}
        preload="intent"
        className={cn(
          "hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors",
          isActive && "text-foreground font-medium",
        )}
      >
        {children}
        <Icon
          className={cn(
            "size-3.5",
            isActive ? "text-primary" : "text-muted-foreground/50",
          )}
        />
      </Link>
    </TableHead>
  );
}
