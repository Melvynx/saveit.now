import { getUsersWithStats } from "@/lib/database/admin-users";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AdminPagination } from "./admin-pagination";
import { UserRowClient } from "./user-row-client";

type UserTableProps = {
  searchParams: {
    page: number;
    search: string;
    sortBy: "createdAt" | "bookmarks" | "clicks";
    order: "asc" | "desc";
    filter: "all" | "premium" | "regular";
  };
};

export const UserTable = async ({ searchParams }: UserTableProps) => {
  const pageSize = 10;

  const { users, total, totalPages } = await getUsersWithStats({
    page: searchParams.page,
    pageSize,
    search: searchParams.search || undefined,
    sortBy: searchParams.sortBy,
    order: searchParams.order,
    filter: searchParams.filter,
  });

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
            <UserRowClient key={user.id} user={user} />
          ))}
        </TableBody>
      </Table>

      <AdminPagination
        currentPage={searchParams.page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
};
