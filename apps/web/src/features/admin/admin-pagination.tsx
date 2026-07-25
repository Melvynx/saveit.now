import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminSearchParams } from "./search-params";
import { nextAdminSearch, PAGE_SIZE_OPTIONS } from "./search-params";

type AdminPaginationProps = {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  searchParams: AdminSearchParams;
};

/**
 * Pagination as real client-side navigation. The previous version rendered raw
 * `<a href>` links, which reloaded the whole document on every page change.
 */
export const AdminPagination = ({
  currentPage,
  totalPages,
  total,
  pageSize,
  searchParams,
}: AdminPaginationProps) => {
  const navigate = useNavigate();
  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-muted-foreground text-sm tabular-nums">
          {total === 0
            ? "No users found"
            : `Showing ${startItem.toLocaleString()}–${endItem.toLocaleString()} of ${total.toLocaleString()} users`}
        </p>
        {/* Page size lives next to the page controls it governs, not in the
            filter bar: it shapes the view, it is not a constraint on the data. */}
        <label className="text-muted-foreground flex items-center gap-1.5 text-sm">
          Rows
          <select
            value={pageSize}
            onChange={(event) => {
              void navigate({
                to: "/admin/users",
                search: nextAdminSearch(searchParams, {
                  pageSize: Number(event.target.value),
                  page: 1,
                }),
              });
            }}
            className="border-input bg-background text-foreground focus:border-ring focus:ring-ring/50 h-8 cursor-pointer rounded-md border px-1.5 text-sm outline-none transition-colors focus:ring-3"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                to="/admin/users"
                search={nextAdminSearch(searchParams, {
                  page: currentPage - 1,
                })}
                preload="intent"
              />
            }
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="size-4" />
            Previous
          </Button>
        )}
        <span className="text-muted-foreground min-w-24 text-center text-sm tabular-nums">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        {hasNext ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                to="/admin/users"
                search={nextAdminSearch(searchParams, {
                  page: currentPage + 1,
                })}
                preload="intent"
              />
            }
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
