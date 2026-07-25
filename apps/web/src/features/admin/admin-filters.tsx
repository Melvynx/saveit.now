"use client";

import {
  AdminNativeSelect,
  AdminSearchInput,
} from "@/features/admin/admin-shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Loader } from "@workspace/ui/components/loader";
import { RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AdminSearchParams } from "./search-params";
import {
  ADMIN_SEARCH_DEFAULTS,
  nextAdminSearch,
  PAGE_SIZE_OPTIONS,
} from "./search-params";

const SEARCH_DEBOUNCE_MS = 300;

type AdminFiltersProps = {
  searchParams: AdminSearchParams;
};

/**
 * Filters drive the URL through the router, never through a `<form method="get">`.
 * The old version submitted a native GET form, which reloaded the entire
 * document (and lost every bit of client state) on each filter change.
 */
export const AdminFilters = ({ searchParams }: AdminFiltersProps) => {
  const navigate = useNavigate();
  const [searchDraft, setSearchDraft] = useState(searchParams.search);
  const lastCommitted = useRef(searchParams.search);

  // Keep the input in sync when the URL changes from elsewhere (reset button,
  // back/forward navigation) without fighting the user while they type.
  useEffect(() => {
    if (searchParams.search !== lastCommitted.current) {
      lastCommitted.current = searchParams.search;
      setSearchDraft(searchParams.search);
    }
  }, [searchParams.search]);

  useEffect(() => {
    if (searchDraft === lastCommitted.current) return;

    const timeout = setTimeout(() => {
      lastCommitted.current = searchDraft;
      void navigate({
        to: "/admin/users",
        search: nextAdminSearch(searchParams, { search: searchDraft, page: 1 }),
        replace: true,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchDraft, navigate, searchParams]);

  const update = (next: Partial<AdminSearchParams>) => {
    void navigate({
      to: "/admin/users",
      search: nextAdminSearch(searchParams, { ...next, page: 1 }),
    });
  };

  const isSearching = searchDraft !== searchParams.search;
  // Gate on the chips we actually render, not on `isFilteredSearch`: that also
  // counts `page` and `order`, neither of which produces a chip, so sorting a
  // column or moving to page 2 used to render a bare "Active:" label followed
  // by nothing but the reset button.
  const chips = activeChips(searchParams);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row">
        <AdminSearchInput
          value={searchDraft}
          onValueChange={setSearchDraft}
          placeholder="Search by name, email, or user ID..."
          className="min-w-0"
          trailing={
            isSearching ? (
              <Loader className="text-muted-foreground size-4" />
            ) : searchDraft ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear search"
                className="size-6"
                onClick={() => setSearchDraft("")}
              >
                <X className="size-3.5" />
              </Button>
            ) : null
          }
        />
        <div className="flex flex-wrap items-end gap-2">
          <AdminNativeSelect
            label="Plan"
            value={searchParams.filter}
            onValueChange={(value) =>
              update({ filter: value as AdminSearchParams["filter"] })
            }
            options={[
              { value: "all", label: "All plans" },
              { value: "premium", label: "Premium" },
              { value: "regular", label: "Regular" },
            ]}
          />
          <AdminNativeSelect
            label="Status"
            value={searchParams.status}
            onValueChange={(value) =>
              update({ status: value as AdminSearchParams["status"] })
            }
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" },
            ]}
          />
          <AdminNativeSelect
            label="Role"
            value={searchParams.role}
            onValueChange={(value) =>
              update({ role: value as AdminSearchParams["role"] })
            }
            options={[
              { value: "all", label: "All roles" },
              { value: "admin", label: "Admin" },
              { value: "user", label: "User" },
            ]}
          />
          <AdminNativeSelect
            label="Per page"
            className="min-w-24"
            value={String(searchParams.pageSize)}
            onValueChange={(value) => update({ pageSize: Number(value) })}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
          />
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Active:</span>
          {chips.map((chip) => (
            <Badge key={chip.key} variant="outline" className="gap-1 font-normal">
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label} filter`}
                className="hover:text-foreground text-muted-foreground -mr-0.5 cursor-pointer"
                onClick={() => {
                  if (chip.key === "search") setSearchDraft("");
                  update(chip.reset);
                }}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/admin/users" search={{}} preload="intent" />}
          >
            <RotateCcw className="size-3.5" />
            Reset all
          </Button>
        </div>
      ) : null}
    </div>
  );
};

type Chip = {
  key: keyof AdminSearchParams;
  label: string;
  reset: Partial<AdminSearchParams>;
};

function activeChips(searchParams: AdminSearchParams): Chip[] {
  const chips: Chip[] = [];

  if (searchParams.search) {
    chips.push({
      key: "search",
      label: `“${searchParams.search}”`,
      reset: { search: "" },
    });
  }
  if (searchParams.filter !== ADMIN_SEARCH_DEFAULTS.filter) {
    chips.push({
      key: "filter",
      label: `Plan: ${searchParams.filter}`,
      reset: { filter: ADMIN_SEARCH_DEFAULTS.filter },
    });
  }
  if (searchParams.status !== ADMIN_SEARCH_DEFAULTS.status) {
    chips.push({
      key: "status",
      label: `Status: ${searchParams.status}`,
      reset: { status: ADMIN_SEARCH_DEFAULTS.status },
    });
  }
  if (searchParams.role !== ADMIN_SEARCH_DEFAULTS.role) {
    chips.push({
      key: "role",
      label: `Role: ${searchParams.role}`,
      reset: { role: ADMIN_SEARCH_DEFAULTS.role },
    });
  }
  if (searchParams.sortBy !== ADMIN_SEARCH_DEFAULTS.sortBy) {
    chips.push({
      key: "sortBy",
      label: `Sort: ${searchParams.sortBy}`,
      reset: {
        sortBy: ADMIN_SEARCH_DEFAULTS.sortBy,
        order: ADMIN_SEARCH_DEFAULTS.order,
      },
    });
  }
  if (searchParams.pageSize !== ADMIN_SEARCH_DEFAULTS.pageSize) {
    chips.push({
      key: "pageSize",
      label: `${searchParams.pageSize} per page`,
      reset: { pageSize: ADMIN_SEARCH_DEFAULTS.pageSize },
    });
  }

  return chips;
}
