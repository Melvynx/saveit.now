import { z } from "zod";

const sortOptions = ["createdAt", "name", "bookmarks", "clicks"] as const;
const orderOptions = ["asc", "desc"] as const;
const filterOptions = ["all", "premium", "regular"] as const;
const statusOptions = ["all", "active", "banned"] as const;
const roleOptions = ["all", "admin", "user"] as const;

export type SortBy = (typeof sortOptions)[number];
export type Order = (typeof orderOptions)[number];
export type Filter = (typeof filterOptions)[number];
export type UserStatus = (typeof statusOptions)[number];
export type UserRoleFilter = (typeof roleOptions)[number];

export type AdminSearchParams = {
  page: number;
  search: string;
  sortBy: SortBy;
  order: Order;
  filter: Filter;
  status: UserStatus;
  role: UserRoleFilter;
};

const searchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().catch(""),
  sortBy: z.enum(sortOptions).catch("createdAt"),
  order: z.enum(orderOptions).catch("desc"),
  filter: z.enum(filterOptions).catch("all"),
  status: z.enum(statusOptions).catch("all"),
  role: z.enum(roleOptions).catch("all"),
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
  if (values.status !== "all") params.set("status", values.status);
  if (values.role !== "all") params.set("role", values.role);

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
};
