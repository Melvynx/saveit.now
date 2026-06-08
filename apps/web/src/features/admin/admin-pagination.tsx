import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
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
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex items-center justify-between">
      <Typography variant="muted">
        Showing {startItem} to {endItem} of {total} users
      </Typography>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          asChild={currentPage !== 1}
        >
          {currentPage === 1 ? (
            <span>Previous</span>
          ) : (
            <a href={getAdminSearchHref({ page: currentPage - 1 }, searchParams)}>
              Previous
            </a>
          )}
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          asChild={currentPage !== totalPages}
        >
          {currentPage === totalPages ? (
            <span>Next</span>
          ) : (
            <a href={getAdminSearchHref({ page: currentPage + 1 }, searchParams)}>
              Next
            </a>
          )}
        </Button>
      </div>
    </div>
  );
};
