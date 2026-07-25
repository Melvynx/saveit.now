import type { SearchSchemaInput } from "@tanstack/react-router";
import { z } from "zod";

const sortOptions = ["createdAt", "name", "bookmarks", "clicks"] as const;
const orderOptions = ["asc", "desc"] as const;
const filterOptions = ["all", "premium", "regular"] as const;
const statusOptions = ["all", "active", "banned"] as const;
const roleOptions = ["all", "admin", "user"] as const;

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export type SortBy = (typeof sortOptions)[number];
export type Order = (typeof orderOptions)[number];
export type Filter = (typeof filterOptions)[number];
export type UserStatus = (typeof statusOptions)[number];
export type UserRoleFilter = (typeof roleOptions)[number];

export type AdminSearchParams = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: SortBy;
  order: Order;
  filter: Filter;
  status: UserStatus;
  role: UserRoleFilter;
};

const searchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) =>
      (PAGE_SIZE_OPTIONS as readonly number[]).includes(value),
    )
    .catch(25),
  search: z.string().catch(""),
  sortBy: z.enum(sortOptions).catch("createdAt"),
  order: z.enum(orderOptions).catch("desc"),
  filter: z.enum(filterOptions).catch("all"),
  status: z.enum(statusOptions).catch("all"),
  role: z.enum(roleOptions).catch("all"),
});

/**
 * Declared as a plain function (not a bare zod schema) on purpose. The
 * `& SearchSchemaInput` marker tells the router that the *input* schema is
 * different from the *output* one, so `<Link to="/admin/users">` accepts a
 * partial search object — or none at all — while the route component still
 * reads a fully-defaulted `AdminSearchParams`.
 *
 * The declared input lies slightly (the URL hands us strings, not numbers);
 * that is by design and why every field is coerced + `.catch()`-ed below.
 */
export const parseAdminSearchParams = (
  search: Partial<AdminSearchParams> & SearchSchemaInput,
): AdminSearchParams => searchParamsSchema.parse(search);

/** Parsed off the schema itself — `parseAdminSearchParams` no longer takes a
 * bare `{}` now that its parameter carries the router's input marker. */
export const ADMIN_SEARCH_DEFAULTS: AdminSearchParams =
  searchParamsSchema.parse({});

/**
 * Strips defaults so the URL only carries what the admin actually changed.
 * Used as the `search` updater for every filter `<Link>` / `navigate` call.
 */
export const nextAdminSearch = (
  current: AdminSearchParams,
  next: Partial<AdminSearchParams>,
): Partial<AdminSearchParams> => {
  const merged = { ...current, ...next };
  const result: Partial<AdminSearchParams> = {};

  for (const key of Object.keys(merged) as (keyof AdminSearchParams)[]) {
    if (merged[key] !== ADMIN_SEARCH_DEFAULTS[key]) {
      // Assigning through a union-keyed record needs the widened value type.
      (result as Record<string, unknown>)[key] = merged[key];
    }
  }

  return result;
};
