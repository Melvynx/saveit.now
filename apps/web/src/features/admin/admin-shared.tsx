import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Copy, Minus, Search, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AdminSparkline } from "./admin-charts";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatRelativeTime(timestamp: number | null | undefined) {
  if (!timestamp) return "never";

  const delta = Date.now() - timestamp;
  if (delta < MINUTE) return "just now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h ago`;
  if (delta < 30 * DAY) return `${Math.floor(delta / DAY)}d ago`;
  if (delta < 365 * DAY) return `${Math.floor(delta / (30 * DAY))}mo ago`;
  return `${Math.floor(delta / (365 * DAY))}y ago`;
}

export function formatDateTime(timestamp: number | null | undefined) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Relative label with the absolute timestamp behind a tooltip. */
export function AdminRelativeTime({
  timestamp,
  className,
}: {
  timestamp: number | null | undefined;
  className?: string;
}) {
  if (!timestamp) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  return (
    <InlineTooltip title={formatDateTime(timestamp)}>
      <time
        dateTime={new Date(timestamp).toISOString()}
        className={cn("cursor-default whitespace-nowrap", className)}
      >
        {formatRelativeTime(timestamp)}
      </time>
    </InlineTooltip>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export function AdminPageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1">{eyebrow}</div> : null}
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <div className="text-muted-foreground mt-1 text-sm">{description}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminSectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            {Icon ? <Icon className="text-muted-foreground size-4" /> : null}
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="mt-1">{description}</CardDescription>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="bg-muted text-muted-foreground mb-1 flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" />
        </div>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * A KPI tile: value, optional period-over-period trend and optional sparkline.
 * `trend` is a percentage; `null` means "no baseline to compare against".
 */
export function AdminMetricCard({
  title,
  value,
  hint,
  icon: Icon,
  trend,
  trendLabel,
  series,
  invertTrend = false,
  className,
}: {
  title: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  trend?: number | null;
  trendLabel?: string;
  series?: { date: string; value: number }[];
  invertTrend?: boolean;
  className?: string;
}) {
  // `trendLabel` explains the comparison the pill is making and wins when set;
  // `hint` is the standalone caption for tiles with no baseline. Guarding on
  // the value actually rendered — an earlier version tested `hint` while
  // rendering `trendLabel`, which dropped `hint` entirely on any tile that set
  // both, and rendered nothing at all on a tile that set only `trendLabel`.
  const caption = trendLabel ?? hint;

  return (
    <Card className={cn("gap-0 overflow-hidden py-4", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {title}
        </CardTitle>
        {Icon ? <Icon className="text-muted-foreground size-4" /> : null}
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {trend === undefined ? null : (
                <AdminTrendPill trend={trend} invert={invertTrend} />
              )}
              {caption ? (
                <span
                  className="text-muted-foreground truncate text-xs"
                  // The tile is narrow enough that captions truncate; keep the
                  // full text recoverable on hover.
                  title={typeof caption === "string" ? caption : undefined}
                >
                  {caption}
                </span>
              ) : null}
            </div>
          </div>
          {series && series.length > 1 ? (
            <AdminSparkline
              data={series}
              className={cn(
                "h-9 w-24 shrink-0",
                trend !== undefined && trend !== null && trend < 0 && !invertTrend
                  ? "text-muted-foreground"
                  : "text-primary",
              )}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminTrendPill({
  trend,
  invert = false,
}: {
  trend: number | null;
  invert?: boolean;
}) {
  if (trend === null) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <Minus className="size-3" />
        new
      </span>
    );
  }

  const isUp = trend > 0;
  const isFlat = trend === 0;
  const isGood = invert ? !isUp : isUp;
  const Icon = isUp ? TrendingUp : isFlat ? Minus : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
        isFlat
          ? "bg-muted text-muted-foreground"
          : isGood
            ? "bg-primary/10 text-primary"
            : "bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3" />
      {isUp ? "+" : ""}
      {trend}%
    </span>
  );
}

export function AdminMetricCardSkeleton() {
  return (
    <Card className="gap-0 py-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="size-4 rounded" />
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

const AVATAR_TONES = [
  "bg-primary/10 text-primary",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

const initialsOf = (name?: string | null, email?: string | null) => {
  const source = (name ?? email ?? "?").trim();
  const parts = source.split(/[\s@._-]+/u).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
};

const toneOf = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
};

/** Deterministic initials avatar — the repo has no Avatar component. */
export function AdminAvatar({
  name,
  email,
  seed,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string | null;
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-14 text-lg",
        toneOf(seed ?? email ?? name ?? "?"),
        className,
      )}
    >
      {initialsOf(name, email)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Copy to clipboard
// ---------------------------------------------------------------------------

export function AdminCopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <InlineTooltip title={copied ? "Copied" : label}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${label}: ${value}`}
        className={cn("size-6 shrink-0", className)}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          void navigator.clipboard.writeText(value).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        {copied ? (
          <Check className="text-primary size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </InlineTooltip>
  );
}

/** Monospace value + copy affordance, used for IDs and customer references. */
export function AdminCopyableValue({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;

  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      <code className="bg-muted truncate rounded px-1.5 py-0.5 font-mono text-xs">
        {value}
      </code>
      <AdminCopyButton value={value} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inputs & badges
// ---------------------------------------------------------------------------

export function AdminSearchInput({
  value,
  onValueChange,
  placeholder = "Search...",
  className,
  trailing,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={cn("relative min-w-56 flex-1", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className="pl-9 pr-10"
      />
      {trailing ? (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

export function AdminNativeSelect({
  label,
  value,
  onValueChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-32 flex-col gap-1", className)}>
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="border-input bg-background focus:border-ring focus:ring-ring/50 h-9 cursor-pointer rounded-lg border px-2.5 text-sm outline-none transition-colors focus:ring-3"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminStatusBadge({ value }: { value?: string | null }) {
  const normalized = value ?? "unknown";
  const variant =
    normalized === "active" ||
    normalized === "admin" ||
    normalized === "premium" ||
    normalized === "pro" ||
    normalized === "lifetime" ||
    normalized === "verified"
      ? "default"
      : normalized === "banned" ||
          normalized === "unverified" ||
          normalized === "canceled" ||
          normalized === "past_due"
        ? "destructive"
        : "outline";

  return <Badge variant={variant}>{normalized}</Badge>;
}

/** "Showing bounded data" notice — never present a capped scan as a total. */
export function AdminScanNotice({
  capped,
  limit,
  noun,
  className,
}: {
  capped: boolean;
  limit: number;
  noun: string;
  className?: string;
}) {
  if (!capped) return null;

  return (
    <p className={cn("text-muted-foreground text-xs", className)}>
      Showing the most recent {limit.toLocaleString()} {noun}. Older records are
      excluded from these numbers.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

export function AdminTableSkeleton({
  headers,
  rows = 6,
}: {
  headers: string[];
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header, columnIndex) => (
                <TableCell key={header}>
                  {columnIndex === 0 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 shrink-0 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-16" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AdminListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
