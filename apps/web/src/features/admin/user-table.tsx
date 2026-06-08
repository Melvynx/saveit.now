import type { UserWithStats } from "@/lib/database/admin-users";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AdminPagination } from "./admin-pagination";
import type { AdminSearchParams } from "./search-params";
import { UserRow } from "./user-row";

type UserTableProps = {
  searchParams: AdminSearchParams;
  users: UserWithStats[];
  total: number;
  totalPages: number;
};

export const UserTable = ({
  searchParams,
  users,
  total,
  totalPages,
}: UserTableProps) => {
  const pageSize = 10;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bookmarks</TableHead>
            <TableHead>Clicks</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </TableBody>
      </Table>
      <AdminPagination
        currentPage={searchParams.page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        searchParams={searchParams}
      />
    </>
  );
};
