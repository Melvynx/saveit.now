import { cn } from "@workspace/ui/lib/utils";
import { Clock, CornerDownLeft, Hash, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export type SearchSuggestionItem =
  | { kind: "recent"; value: string }
  | { kind: "tag"; value: string };

const SYNTAX_HINTS = [
  { token: "#tag", label: "tag" },
  { token: "type:video", label: "type" },
  { token: "is:starred", label: "starred" },
  { token: "is:unread", label: "unread" },
];

type SearchSuggestionsProps = {
  id: string;
  mode: "recent" | "tags" | null;
  items: SearchSuggestionItem[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: SearchSuggestionItem) => void;
  onRemoveRecent: (value: string) => void;
  onClearRecents: () => void;
};

/** Dropdown under the search field: recent searches or `#tag` completions. */
export function SearchSuggestions({
  id,
  mode,
  items,
  activeIndex,
  onHover,
  onSelect,
  onRemoveRecent,
  onClearRecents,
}: SearchSuggestionsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
      // Keep focus in the input while clicking inside the panel.
      onMouseDown={(event) => event.preventDefault()}
      className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-[14px] bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
    >
      {mode === "recent" ? (
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <span className="text-[12px] font-medium text-muted-foreground">
            {items.length > 0 ? "Recent searches" : "Search tips"}
          </span>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={onClearRecents}
              className="rounded px-1 text-[12px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : (
        <div className="px-3 pt-2.5 pb-1 text-[12px] font-medium text-muted-foreground">
          Filter by tag
        </div>
      )}

      {items.length > 0 ? (
        <ul id={id} role="listbox" aria-label={mode === "tags" ? "Tags" : "Recent searches"} className="px-1 pb-1">
          {items.map((item, index) => {
            const active = index === activeIndex;
            const Icon = item.kind === "tag" ? Hash : Clock;
            return (
              <li
                key={`${item.kind}-${item.value}`}
                id={`${id}-${index}`}
                role="option"
                aria-selected={active}
                onMouseEnter={() => onHover(index)}
                onClick={() => onSelect(item)}
                className={cn(
                  "group/item flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-[13px]",
                  active ? "bg-muted text-foreground" : "text-foreground/90",
                )}
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.value}</span>
                {active ? (
                  <CornerDownLeft className="size-3 text-muted-foreground" aria-hidden="true" />
                ) : null}
                {item.kind === "recent" ? (
                  <button
                    type="button"
                    aria-label={`Remove "${item.value}" from recent searches`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveRecent(item.value);
                    }}
                    className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 outline-none group-hover/item:opacity-100 hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-aria-selected/item:opacity-100 pointer-coarse:opacity-100"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {mode === "recent" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/70 bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
          {SYNTAX_HINTS.map((hint) => (
            <span key={hint.token} className="inline-flex items-center gap-1.5">
              <code className="rounded-[5px] bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground ring-1 ring-foreground/8">
                {hint.token}
              </code>
              {hint.label}
            </span>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
