import { cn } from "@workspace/ui/lib/utils";
import { type ReactNode, useEffect, useState } from "react";

export type PageHeaderProps = {
  title: ReactNode;
  count?: number;
  description?: ReactNode;
  /** Right-aligned slot (buttons, view switcher). */
  actions?: ReactNode;
  /** Toolbar row rendered under the title bar (search field, chips). */
  children?: ReactNode;
  className?: string;
};

const countFormatter = new Intl.NumberFormat("en-US");

function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return scrolled;
}

/**
 * Sticky 52px page title bar used by every /app screen. Sits under the
 * mobile top bar on small screens and at the very top on desktop.
 */
export function PageHeader({
  title,
  count,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) {
  const scrolled = useScrolled();

  return (
    <header
      data-slot="page-header"
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-13 z-30 border-b border-transparent bg-background/80 backdrop-blur-xl backdrop-saturate-150 transition-[border-color] duration-200 md:top-0",
        "data-scrolled:border-border",
        className,
      )}
    >
      <div className="flex h-13 items-center gap-3 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {count !== undefined ? (
            <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
              {countFormatter.format(count)}
            </span>
          ) : null}
          {description ? (
            <p className="hidden min-w-0 truncate text-[13px] text-muted-foreground lg:block">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        ) : null}
      </div>
      {children ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 px-4 pb-3 md:px-6">
          {children}
        </div>
      ) : null}
    </header>
  );
}
