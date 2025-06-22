import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

const sortOptions = ["createdAt", "bookmarks", "clicks"] as const;
const orderOptions = ["asc", "desc"] as const;
const filterOptions = ["all", "premium", "regular"] as const;

export const adminSearchParams = {
  page: parseAsInteger.withDefault(1),
  search: parseAsString.withDefault(""),
  sortBy: parseAsStringLiteral(sortOptions).withDefault("createdAt"),
  order: parseAsStringLiteral(orderOptions).withDefault("desc"),
  filter: parseAsStringLiteral(filterOptions).withDefault("all"),
};

export const searchParamsCache = createSearchParamsCache(adminSearchParams);

export type AdminSearchParams = typeof adminSearchParams;
export type SortBy = (typeof sortOptions)[number];
export type Order = (typeof orderOptions)[number];
export type Filter = (typeof filterOptions)[number];
