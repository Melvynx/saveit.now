/**
 * Admin user-search helpers. Pure TypeScript so the match rules can be
 * unit-tested without spinning up Convex.
 *
 * `listUsersForAdmin` used to take the newest 500 rows and *then* substring-
 * filter. Anyone older than that window — "Varenska", an exact email, a
 * pasted user id — silently disappeared. Indexed lookup now feeds candidates
 * into these predicates.
 */

export type AdminUserSearchRow = {
  _id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  banned?: boolean | null;
};

export const includesSearch = (value: unknown, search: string) =>
  String(value ?? "")
    .toLowerCase()
    .includes(search.toLowerCase());

export function searchCaseVariants(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const variants = new Set([
    trimmed,
    trimmed.toLowerCase(),
    trimmed.toUpperCase(),
  ]);
  variants.add(
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase(),
  );
  return [...variants];
}

export const prefixEnd = (value: string) => `${value}\uffff`;

/** Convex searchIndex chokes on punctuation-only queries; keep tokens. */
export function searchIndexQuery(value: string): string | null {
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{N}@._+\- ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 2) return null;
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return null;
  return cleaned;
}

export function matchesAdminSearch(
  row: AdminUserSearchRow,
  search: string,
): boolean {
  const needle = search.trim();
  if (!needle) return true;
  if (row._id === needle) return true;
  return includesSearch(row.email, needle) || includesSearch(row.name, needle);
}

export function matchesAdminRoleStatus(
  row: AdminUserSearchRow,
  args: { role?: "admin" | "user"; status?: "active" | "banned" },
): boolean {
  if (args.role && row.role !== args.role) return false;
  if (args.status === "banned" && row.banned !== true) return false;
  if (args.status === "active" && row.banned === true) return false;
  return true;
}

export function uniqueById<T extends { _id: string }>(
  rows: Array<T | null | undefined>,
): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!row) continue;
    const id = String(row._id);
    if (!map.has(id)) map.set(id, row);
  }
  return [...map.values()];
}
