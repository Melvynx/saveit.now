import { z } from "zod";

const sortOptions = ["createdAt", "bookmarks", "clicks"] as const;
const orderOptions = ["asc", "desc"] as const;
const filterOptions = ["all", "premium", "regular"] as const;

export type SortBy = (typeof sortOptions)[number];
export type Order = (typeof orderOptions)[number];
export type Filter = (typeof filterOptions)[number];

export type AdminSearchParams = {
  page: number;
  search: string;
  sortBy: SortBy;
  order: Order;
  filter: Filter;
};

const searchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().catch(""),
  sortBy: z.enum(sortOptions).catch("createdAt"),
  order: z.enum(orderOptions).catch("desc"),
  filter: z.enum(filterOptions).catch("all"),
});

export const parseAdminSearchParams = (
  search: Partial<Record<string, unknown>>,
): AdminSearchParams => searchParamsSchema.parse(search);

export const getAdminSearchHref = (
  next: Partial<AdminSearchParams>,
  current: AdminSearchParams,
) => {
  const params = new URLSearchParams();
  const values = { ...current, ...next };

  if (values.page > 1) params.set("page", String(values.page));
  if (values.search) params.set("search", values.search);
  if (values.sortBy !== "createdAt") params.set("sortBy", values.sortBy);
  if (values.order !== "desc") params.set("order", values.order);
  if (values.filter !== "all") params.set("filter", values.filter);

  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
};
