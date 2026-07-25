import { cn } from "@workspace/ui/lib/utils";
import { useId, useState } from "react";

/**
 * Hand-rolled inline SVG charts.
 *
 * The repo has no charting dependency and this admin panel is not worth adding
 * one for. Every chart paints with `currentColor`, so the caller sets the hue
 * with a text-* class and light/dark themes are handled for free.
 */

export type ChartPoint = { date: string; value: number };

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 160;

const buildScale = (data: ChartPoint[], height: number) => {
  const max = Math.max(...data.map((point) => point.value), 1);
  const step = data.length > 1 ? VIEW_WIDTH / (data.length - 1) : VIEW_WIDTH;
  const x = (index: number) => index * step;
  const y = (value: number) => height - (value / max) * (height * 0.88) - 4;
  return { max, x, y };
};

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

/** Tiny trend line for KPI tiles. No axes, no interaction. */
export function AdminSparkline({
  data,
  className,
}: {
  data: ChartPoint[];
  className?: string;
}) {
  if (data.length < 2) return null;

  const height = 40;
  const { x, y } = buildScale(data, height);
  const line = data
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`)
    .join(" ");
  const area = `${line} L${VIEW_WIDTH},${height} L0,${height} Z`;
  const last = data[data.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <path d={area} fill="currentColor" fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={VIEW_WIDTH}
        cy={y(last.value)}
        r={3}
        fill="currentColor"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Area chart
// ---------------------------------------------------------------------------

/** Full-width area chart with a hover readout and a zero-baseline grid. */
export function AdminAreaChart({
  data,
  label,
  className,
  height = VIEW_HEIGHT,
}: {
  data: ChartPoint[];
  label: string;
  className?: string;
  height?: number;
}) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        Not enough data yet
      </div>
    );
  }

  const { max, x, y } = buildScale(data, height);
  const line = data
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`)
    .join(" ");
  const area = `${line} L${VIEW_WIDTH},${height} L0,${height} Z`;
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const active = hovered === null ? null : data[hovered];

  return (
    <div className={cn("relative", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {active ? (
            <span className="text-foreground font-medium tabular-nums">
              {active.value.toLocaleString()} {label}
            </span>
          ) : (
            <>
              {total.toLocaleString()} {label} over {data.length} days
            </>
          )}
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {active ? formatChartDate(active.date) : `peak ${max.toLocaleString()}`}
        </p>
      </div>

      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          preserveAspectRatio="none"
          className="text-primary size-full"
          role="img"
          aria-label={`${label} over the last ${data.length} days`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={0}
              x2={VIEW_WIDTH}
              y1={height * ratio}
              y2={height * ratio}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray="4 6"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {active && hovered !== null ? (
            <>
              <line
                x1={x(hovered)}
                x2={x(hovered)}
                y1={0}
                y2={height}
                stroke="currentColor"
                strokeOpacity={0.35}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={x(hovered)}
                cy={y(active.value)}
                r={4}
                fill="currentColor"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}
        </svg>

        {/* Hover targets live in the DOM so the readout works without SVG math. */}
        <div
          className="absolute inset-0 flex"
          onMouseLeave={() => setHovered(null)}
        >
          {data.map((point, index) => (
            <button
              key={point.date}
              type="button"
              tabIndex={-1}
              aria-label={`${point.date}: ${point.value}`}
              className="h-full flex-1 cursor-default"
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
            />
          ))}
        </div>
      </div>

      <div className="text-muted-foreground mt-1.5 flex justify-between text-[11px]">
        <span>{formatChartDate(data[0]!.date)}</span>
        <span>{formatChartDate(data[data.length - 1]!.date)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distribution bar
// ---------------------------------------------------------------------------

/** Single horizontal stacked bar — used for the plan / status mix. */
export function AdminDistributionBar({
  segments,
  className,
}: {
  segments: { label: string; value: number; className: string }[];
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
        {total === 0
          ? null
          : segments.map((segment) => (
              <div
                key={segment.label}
                className={cn("h-full", segment.className)}
                style={{ width: `${(segment.value / total) * 100}%` }}
              />
            ))}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn("size-2 shrink-0 rounded-full", segment.className)}
              />
              <span className="text-muted-foreground truncate">
                {segment.label}
              </span>
            </span>
            <span className="font-medium tabular-nums">
              {segment.value.toLocaleString()}
              <span className="text-muted-foreground ml-1.5 text-xs">
                {total === 0
                  ? "0%"
                  : `${Math.round((segment.value / total) * 100)}%`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Usage meter for per-user plan limits. */
export function AdminUsageBar({
  used,
  limit,
  label,
  className,
}: {
  used: number;
  limit: number;
  label: string;
  className?: string;
}) {
  const ratio = limit <= 0 ? 0 : Math.min(used / limit, 1);
  const percent = Math.round(ratio * 100);
  const isCritical = percent >= 90;
  const isWarning = percent >= 70 && !isCritical;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="font-medium tabular-nums">
          {used.toLocaleString()}
          <span className="text-muted-foreground"> / {limit.toLocaleString()}</span>
        </span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            isCritical
              ? "bg-destructive"
              : isWarning
                ? "bg-chart-2"
                : "bg-primary",
          )}
          style={{ width: `${Math.max(percent, used > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

const formatChartDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
