/**
 * Shared helpers for chat usage calculation.
 * Plain TypeScript — no Convex function registrations.
 */

/**
 * Returns the UTC timestamp (in ms) for the first millisecond of the current
 * calendar month. Used as the lower bound for counting chat usage rows.
 *
 * Equivalent to dayjs().startOf("month").valueOf() but without dayjs.
 */
export function startOfMonth(): number {
  return Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    1,
  );
}
