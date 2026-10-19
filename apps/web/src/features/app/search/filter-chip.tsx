import { cn } from "@workspace/ui/lib/utils";
import { forwardRef, type ComponentProps } from "react";

export const filterChipClassName = (active?: boolean) =>
  cn(
    "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap select-none",
    "ring-1 ring-inset transition-[background-color,color,box-shadow] duration-150 ease-out outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
    active
      ? "bg-primary/10 text-foreground ring-primary/35 hover:bg-primary/14 [&_svg]:text-primary"
      : "bg-card text-muted-foreground ring-border hover:bg-muted hover:text-foreground",
  );

type FilterChipProps = ComponentProps<"button"> & { active?: boolean };

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ active, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      data-active={active || undefined}
      className={cn(filterChipClassName(active), className)}
      {...props}
    />
  ),
);

FilterChip.displayName = "FilterChip";
