import type { AdminUserListItem } from "@/features/admin/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AdminPagination } from "./admin-pagination";
import type { AdminSearchParams } from "./search-params";
import { UserRow } from "./user-row";

type UserTableProps = {
  searchParams: AdminSearchParams;
  users: AdminUserListItem[];
  total: number;
  totalPages: number;
  pageSize: number;
};

export const UserTable = ({
  searchParams,
  users,
  total,
  totalPages,
  pageSize,
}: UserTableProps) => {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => <UserRow key={user.id} user={user} />)
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No users match these filters.
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
