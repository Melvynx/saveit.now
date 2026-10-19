import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Kbd } from "@workspace/ui/components/kbd";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  LayoutGrid,
  List,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import {
  type LibrarySort,
  type LibraryView,
  useLibraryPreferences,
} from "./library-preferences";

const VIEW_OPTIONS: { value: LibraryView; label: string; icon: LucideIcon }[] = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
  { value: "compact", label: "Compact", icon: Rows3 },
];

/** Grid | List | Compact segmented switch (V cycles). */
export function ViewSwitcher() {
  const view = useLibraryPreferences((state) => state.view);
  const setView = useLibraryPreferences((state) => state.setView);

  return (
    <div
      role="radiogroup"
      aria-label="View"
      className="flex h-8 items-center gap-0.5 rounded-lg bg-muted p-0.5"
    >
      {VIEW_OPTIONS.map((option) => {
        const active = option.value === view;
        const Icon = option.icon;
        return (
          <InlineTooltip
            key={option.value}
            title={
              <span className="flex items-center gap-1.5">
                {option.label} view <Kbd>V</Kbd>
              </span>
            }
          >
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${option.label} view`}
              data-testid={`view-${option.value}`}
              onClick={() => setView(option.value)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,box-shadow] duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                active &&
                  "bg-background text-foreground shadow-xs ring-1 ring-foreground/6",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </button>
          </InlineTooltip>
        );
      })}
    </div>
  );
}

const SORT_LABELS: Record<LibrarySort, string> = {
  newest: "Newest",
  oldest: "Oldest",
};

export function SortMenu({ disabled }: { disabled?: boolean }) {
  const sort = useLibraryPreferences((state) => state.sort);
  const setSort = useLibraryPreferences((state) => state.setSort);
  const Icon = sort === "newest" ? ArrowDownWideNarrow : ArrowUpNarrowWide;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1.5 px-2 text-[13px] font-normal text-muted-foreground hover:text-foreground"
          aria-label={`Sort: ${SORT_LABELS[sort]}`}
          title={disabled ? "Search results are sorted by relevance" : undefined}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup
          value={sort}
          onValueChange={(value) => setSort(value as LibrarySort)}
        >
          <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
