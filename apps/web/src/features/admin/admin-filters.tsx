import type { AdminSearchParams } from "./search-params";
import {
  AdminNativeSelect,
  AdminSearchInput,
} from "@/features/admin/admin-shared";
import { Button } from "@workspace/ui/components/button";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

type AdminFiltersProps = {
  searchParams: AdminSearchParams;
};

export const AdminFilters = ({ searchParams }: AdminFiltersProps) => {
  return (
    <form className="space-y-3" method="get">
      <div className="flex flex-col gap-3 xl:flex-row">
        <AdminSearchInput
          defaultValue={searchParams.search}
          placeholder="Search by name, email, or user ID..."
          className="min-w-0"
        />
        <div className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="page" value="1" />
          <AdminNativeSelect
            label="Plan"
            name="filter"
            defaultValue={searchParams.filter}
            options={[
              { value: "all", label: "All plans" },
              { value: "premium", label: "Premium" },
              { value: "regular", label: "Regular" },
            ]}
          />
          <AdminNativeSelect
            label="Status"
            name="status"
            defaultValue={searchParams.status}
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" },
            ]}
          />
          <AdminNativeSelect
            label="Role"
            name="role"
            defaultValue={searchParams.role}
            options={[
              { value: "all", label: "All roles" },
              { value: "admin", label: "Admin" },
              { value: "user", label: "User" },
            ]}
          />
          <AdminNativeSelect
            label="Sort"
            name="sortBy"
            defaultValue={searchParams.sortBy}
            options={[
              { value: "createdAt", label: "Created" },
              { value: "name", label: "Name" },
              { value: "bookmarks", label: "Bookmarks" },
              { value: "clicks", label: "Clicks" },
            ]}
          />
          <AdminNativeSelect
            label="Order"
            name="order"
            defaultValue={searchParams.order}
            options={[
              { value: "desc", label: "Descending" },
              { value: "asc", label: "Ascending" },
            ]}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit">
          <SlidersHorizontal className="size-4" />
          Apply filters
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/admin/users">
            <RotateCcw className="size-4" />
            Reset
          </a>
        </Button>
      </div>
    </form>
  );
};
