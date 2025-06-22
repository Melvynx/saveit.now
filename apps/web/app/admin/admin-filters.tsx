"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { ChevronDown, Search } from "lucide-react";
import { useQueryStates } from "nuqs";
import type { Filter, Order, SortBy } from "./search-params";
import { adminSearchParams } from "./search-params";

export const AdminFilters = () => {
  const [filters, setFilters] = useQueryStates(adminSearchParams, {
    shallow: false,
    throttleMs: 1000,
  });

  const getFilterLabel = (filter: Filter) => {
    switch (filter) {
      case "all":
        return "All Users";
      case "premium":
        return "Premium Only";
      case "regular":
        return "Regular Only";
      default:
        return "Filter by plan";
    }
  };

  const getSortLabel = (sortBy: SortBy) => {
    switch (sortBy) {
      case "createdAt":
        return "Created Date";
      case "bookmarks":
        return "Bookmarks Count";
      case "clicks":
        return "Clicks Count";
      default:
        return "Sort by";
    }
  };

  const getOrderLabel = (order: Order) => {
    switch (order) {
      case "asc":
        return "Ascending";
      case "desc":
        return "Descending";
      default:
        return "Order";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search users by email..."
          value={filters.search}
          onChange={(e) => {
            setFilters({
              search: e.target.value,
              page: 1, // Reset page when searching
            });
          }}
          className="pl-10"
        />
      </div>

      {/* Filter by Plan */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-[180px]">
            {getFilterLabel(filters.filter)}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() =>
              setFilters({
                filter: "all",
                page: 1,
              })
            }
          >
            All Users
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              setFilters({
                filter: "premium",
                page: 1,
              })
            }
          >
            Premium Only
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              setFilters({
                filter: "regular",
                page: 1,
              })
            }
          >
            Regular Only
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort By */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-[180px]">
            {getSortLabel(filters.sortBy)}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() =>
              setFilters({
                sortBy: "createdAt",
                page: 1,
              })
            }
          >
            Created Date
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              setFilters({
                sortBy: "bookmarks",
                page: 1,
              })
            }
          >
            Bookmarks Count
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              setFilters({
                sortBy: "clicks",
                page: 1,
              })
            }
          >
            Clicks Count
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Order */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-[120px]">
            {getOrderLabel(filters.order)}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() =>
              setFilters({
                order: "desc",
                page: 1,
              })
            }
          >
            Descending
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              setFilters({
                order: "asc",
                page: 1,
              })
            }
          >
            Ascending
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
