const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const shortDateYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DAY_MS = 86_400_000;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const toTimestamp = (value: Date | number | undefined) =>
  value === undefined ? null : typeof value === "number" ? value : value.getTime();

export function dayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function dayLabel(timestamp: number, now = new Date()) {
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(new Date(timestamp))) / DAY_MS,
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return weekdayFormatter.format(timestamp);
  if (new Date(timestamp).getFullYear() === now.getFullYear()) {
    return monthDayFormatter.format(timestamp);
  }
  return fullDateFormatter.format(timestamp);
}

export const timeLabel = (timestamp: number) => timeFormatter.format(timestamp);

/** Time for today, short date otherwise ("2:30 PM", "Oct 3", "Oct 3, 2024"). */
export function rowDateLabel(timestamp: number, now = new Date()) {
  if (startOfDay(new Date(timestamp)) === startOfDay(now)) {
    return timeFormatter.format(timestamp);
  }
  if (new Date(timestamp).getFullYear() === now.getFullYear()) {
    return shortDateFormatter.format(timestamp);
  }
  return shortDateYearFormatter.format(timestamp);
}

const relativeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

/** "3 months ago", "last year". */
export function relativeAge(timestamp: number, now = Date.now()) {
  const days = Math.round((now - timestamp) / DAY_MS);
  if (days < 30) return relativeFormatter.format(-Math.max(days, 1), "day");
  if (days < 365) {
    return relativeFormatter.format(-Math.round(days / 30), "month");
  }
  return relativeFormatter.format(-Math.round(days / 365), "year");
}

export type DayGroup<T> = { key: string; label: string; items: T[] };

/** Groups items (already sorted by date) into consecutive day buckets. */
export function groupByDay<T>(
  items: T[],
  getTimestamp: (item: T) => number | null,
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  const now = new Date();
  for (const item of items) {
    const timestamp = getTimestamp(item);
    const key = timestamp === null ? "unknown" : dayKey(timestamp);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
      continue;
    }
    groups.push({
      key,
      label: timestamp === null ? "Earlier" : dayLabel(timestamp, now),
      items: [item],
    });
  }
  return groups;
}
