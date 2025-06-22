"use client";

import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { useQueryState } from "nuqs";
import { adminSearchParams } from "./search-params";

type AdminPaginationProps = {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

export const AdminPagination = ({
  currentPage,
  totalPages,
  total,
  pageSize,
}: AdminPaginationProps) => {
  const [, setPage] = useQueryState(
    "page",
    adminSearchParams.page.withOptions({
      shallow: false,
      throttleMs: 1000,
    }),
  );

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
          onClick={() => setPage(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => setPage(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
