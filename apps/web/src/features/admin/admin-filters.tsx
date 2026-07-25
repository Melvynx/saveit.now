"use client";

import { AdminSearchInput } from "@/features/admin/admin-shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Loader } from "@workspace/ui/components/loader";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Circle,
  Gem,
  ListFilter,
  RotateCcw,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AdminSearchParams } from "./search-params";
import { ADMIN_SEARCH_DEFAULTS, nextAdminSearch } from "./search-params";

const SEARCH_DEBOUNCE_MS = 300;

// ---------------------------------------------------------------------------
// Filter definitions
// ---------------------------------------------------------------------------

/** The `AdminSearchParams` keys this bar exposes as removable chips. */
type FilterKey = "filter" | "status" | "role";

type FilterDefinition<K extends FilterKey = FilterKey> = {
  key: K;
  label: string;
  icon: ReactNode;
  options: { value: AdminSearchParams[K]; label: string; icon: ReactNode }[];
};

/**
 * Infers `K` from `key` so an option value has to belong to that param's own
 * enum — a `{ key: "status", value: "premium" }` typo fails to compile instead
 * of silently producing a URL the route schema throws away.
 */
const defineFilter = <K extends FilterKey>(definition: FilterDefinition<K>) =>
  definition as FilterDefinition;

/**
 * `"all"` is deliberately absent from every option list: it is the default, and
 * the default is expressed by *not having a chip*. Picking it back is what the
 * chip's ✕ does.
 */
const FILTER_DEFINITIONS: FilterDefinition[] = [
  defineFilter({
    key: "filter",
    label: "Plan",
    icon: <Gem className="size-3.5" />,
    options: [
      {
        value: "premium",
        label: "Premium",
        icon: <Gem className="text-primary size-3.5" />,
      },
      {
        value: "regular",
        label: "Regular",
        icon: <Circle className="text-muted-foreground size-3.5" />,
      },
    ],
  }),
  defineFilter({
    key: "status",
    label: "Status",
    icon: <Circle className="size-3.5" />,
    options: [
      {
        value: "active",
        label: "Active",
        icon: <Circle className="fill-primary text-primary size-3.5" />,
      },
      {
        value: "banned",
        label: "Banned",
        icon: (
          <Circle className="fill-destructive text-destructive size-3.5" />
        ),
      },
    ],
  }),
  defineFilter({
    key: "role",
    label: "Role",
    icon: <ShieldCheck className="size-3.5" />,
    options: [
      {
        value: "admin",
        label: "Admin",
        icon: <ShieldCheck className="text-primary size-3.5" />,
      },
      {
        value: "user",
        label: "User",
        icon: <User className="text-muted-foreground size-3.5" />,
      },
    ],
  }),
];

const FILTER_BY_KEY = Object.fromEntries(
  FILTER_DEFINITIONS.map((definition) => [definition.key, definition]),
) as Record<FilterKey, FilterDefinition>;

/**
 * Definitions are keyed *by* the search param they write, so building the patch
 * needs a computed key — the one place a cast is unavoidable. It is sound
 * because `defineFilter` already tied each option value to `AdminSearchParams[key]`.
 */
const patchFor = (key: FilterKey, value: string): Partial<AdminSearchParams> =>
  ({ [key]: value }) as Partial<AdminSearchParams>;

const MENU_ITEM_CLASS =
  "hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors";

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

type AdminFiltersProps = {
  searchParams: AdminSearchParams;
};

/**
 * Search box + one filter button + a chip per active filter.
 *
 * The previous version rendered every filter as an always-visible labelled
 * `<select>`, so four controls sat on screen permanently to express what is
 * usually zero or one active constraint. Filters now cost one button until they
 * exist, and each existing one is a chip you can retarget or remove in place.
 *
 * Everything drives the URL through the router, never a `<form method="get">` —
 * the original submitted a native GET form and reloaded the whole document on
 * every filter change.
 */
export const AdminFilters = ({ searchParams }: AdminFiltersProps) => {
  const navigate = useNavigate();
  const [searchDraft, setSearchDraft] = useState(searchParams.search);
  const lastCommitted = useRef(searchParams.search);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<FilterKey | null>(null);

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

  const closePicker = () => {
    setPickerOpen(false);
    setPickerStep(null);
  };

  const isSearching = searchDraft !== searchParams.search;
  const activeFilters = FILTER_DEFINITIONS.filter(
    (definition) =>
      searchParams[definition.key] !== ADMIN_SEARCH_DEFAULTS[definition.key],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AdminSearchInput
          value={searchDraft}
          onValueChange={setSearchDraft}
          placeholder="Search by name, email, or user ID..."
          className="max-w-sm"
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

        <Popover
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) setPickerStep(null);
          }}
        >
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-9 gap-1.5">
              <ListFilter className="size-4" />
              Filter
              {activeFilters.length > 0 ? (
                <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                  {activeFilters.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 gap-0 p-1">
            <AnimateChangeInHeight>
              {pickerStep === null ? (
                <div className="flex flex-col">
                  {FILTER_DEFINITIONS.map((definition) => {
                    const current = searchParams[definition.key];
                    const isActive =
                      current !== ADMIN_SEARCH_DEFAULTS[definition.key];

                    return (
                      <button
                        key={definition.key}
                        type="button"
                        className={MENU_ITEM_CLASS}
                        onClick={() => setPickerStep(definition.key)}
                      >
                        {definition.icon}
                        {definition.label}
                        {isActive ? (
                          <span className="text-muted-foreground ml-auto text-xs">
                            {current}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col">
                  <button
                    type="button"
                    className={cn(MENU_ITEM_CLASS, "text-muted-foreground")}
                    onClick={() => setPickerStep(null)}
                  >
                    <ChevronLeft className="size-4" />
                    {FILTER_BY_KEY[pickerStep].label}
                  </button>
                  <div className="bg-border my-1 h-px" />
                  {FILTER_BY_KEY[pickerStep].options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={MENU_ITEM_CLASS}
                      onClick={() => {
                        update(patchFor(pickerStep, option.value));
                        closePicker();
                      }}
                    >
                      {option.icon}
                      {option.label}
                      {searchParams[pickerStep] === option.value ? (
                        <Check className="text-primary ml-auto size-3.5" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </AnimateChangeInHeight>
          </PopoverContent>
        </Popover>
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((definition) => (
            <FilterChip
              key={definition.key}
              definition={definition}
              value={searchParams[definition.key]}
              onChange={(value) => update(patchFor(definition.key, value))}
              onRemove={() =>
                update(
                  patchFor(
                    definition.key,
                    ADMIN_SEARCH_DEFAULTS[definition.key],
                  ),
                )
              }
            />
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

// ---------------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------------

/**
 * `Plan · is · Premium · ✕` as four joined segments. The value segment is a
 * menu, so switching from Premium to Regular is one click on the chip rather
 * than a round trip through the filter picker.
 */
function FilterChip({
  definition,
  value,
  onChange,
  onRemove,
}: {
  definition: FilterDefinition;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const active = definition.options.find((option) => option.value === value);

  return (
    <div className="flex items-center gap-px text-xs">
      <span className="bg-muted flex items-center gap-1.5 rounded-l-md py-1 pl-2 pr-1.5 font-medium">
        {definition.icon}
        {definition.label}
      </span>
      <span className="bg-muted text-muted-foreground px-1.5 py-1">is</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Change ${definition.label} filter`}
            className="bg-muted hover:bg-muted/60 hover:text-foreground flex cursor-pointer items-center gap-1.5 px-1.5 py-1 font-medium transition-colors"
          >
            {active?.icon}
            {active?.label ?? value}
            <ChevronDown className="text-muted-foreground size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 min-w-40">
          {definition.options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
            >
              {option.icon}
              {option.label}
              {option.value === value ? (
                <Check className="text-primary ml-auto size-3.5" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        aria-label={`Remove ${definition.label} filter`}
        onClick={onRemove}
        className="bg-muted hover:bg-muted/60 text-muted-foreground hover:text-foreground flex cursor-pointer items-center rounded-r-md px-1.5 py-1 transition-colors"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

/**
 * The picker swaps between "which filter" and "which value" inside a popover
 * that is already positioned; without this the panel snaps between two heights
 * mid-interaction.
 */
function AnimateChangeInHeight({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setHeight(entry.contentRect.height);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className="overflow-hidden"
      style={{ height }}
      animate={{ height }}
      transition={{ duration: 0.12, ease: "easeOut" }}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
}
