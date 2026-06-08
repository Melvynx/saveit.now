import { AdminPagination as SharedAdminPagination } from "@/features/admin/admin-shared";
import type { AdminSearchParams } from "./search-params";
import { getAdminSearchHref } from "./search-params";

type AdminPaginationProps = {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  searchParams: AdminSearchParams;
};

export const AdminPagination = ({
  currentPage,
  totalPages,
  total,
  pageSize,
  searchParams,
}: AdminPaginationProps) => {
  if (totalPages <= 1 && total === 0) return null;

  return (
    <SharedAdminPagination
      currentPage={currentPage}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      getHref={(page) => getAdminSearchHref({ page }, searchParams)}
    />
  );
};
