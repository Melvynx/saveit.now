import { BookmarkType } from "@/lib/bookmark-types";
import { cn } from "@workspace/ui/lib/utils";
import { CircleDot, Hash, Star, X } from "lucide-react";
import { TagMultiSelect } from "../components/tag-multi-select";
import { TypeMultiSelect } from "../components/type-multi-select";
import { getTypeIcon, getTypePluralName } from "../utils/type-filter-utils";
import { FilterChip } from "./filter-chip";
import { useSearchFilters } from "./use-search-filters";

const MAIN_TYPES: BookmarkType[] = [
  BookmarkType.ARTICLE,
  BookmarkType.YOUTUBE,
  BookmarkType.TWEET,
  BookmarkType.PDF,
  BookmarkType.IMAGE,
];
const MORE_TYPES: BookmarkType[] = [
  BookmarkType.PAGE,
  BookmarkType.PRODUCT,
  BookmarkType.VIDEO,
];

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-4 w-px shrink-0 bg-border" />;
}

/**
 * Horizontal filter chips for the library: Starred / Unread, main types,
 * a Tags popover and the selected tags. Reads and writes the URL.
 */
export function FilterBar({ className }: { className?: string }) {
  const {
    types,
    tags,
    special,
    hasFilters,
    toggleType,
    toggleSpecial,
    setState,
    setTags,
    removeTag,
    clearFilters,
  } = useSearchFilters();

  return (
    <div
      data-slot="filter-bar"
      role="toolbar"
      aria-label="Filters"
      className={cn(
        "-mx-4 flex min-w-0 items-center gap-1.5 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden",
        "mask-[linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] md:mask-none",
        className,
      )}
    >
      <FilterChip
        active={special.includes("STAR")}
        onClick={() => void toggleSpecial("STAR")}
      >
        <Star
          aria-hidden="true"
          className={cn(special.includes("STAR") && "fill-current")}
        />
        Starred
      </FilterChip>
      <FilterChip
        active={special.includes("UNREAD")}
        onClick={() => void toggleSpecial("UNREAD")}
      >
        <CircleDot aria-hidden="true" />
        Unread
      </FilterChip>

      <Divider />

      {MAIN_TYPES.map((type) => {
        const Icon = getTypeIcon(type);
        return (
          <FilterChip
            key={type}
            active={types.includes(type)}
            onClick={() => void toggleType(type)}
          >
            <Icon aria-hidden="true" />
            {getTypePluralName(type)}
          </FilterChip>
        );
      })}
      <TypeMultiSelect
        types={MORE_TYPES}
        placeholder="More"
        selectedTypes={types}
        onTypesChange={(next) =>
          void setState({ types: next, matchingDistance: null })
        }
      />

      <Divider />

      <TagMultiSelect selectedTags={tags} onTagsChange={(next) => void setTags(next)} />
      {tags.map((tag) => (
        <FilterChip
          key={tag}
          active
          className="pr-1"
          onClick={() => void removeTag(tag)}
          aria-label={`Remove tag ${tag}`}
        >
          <Hash aria-hidden="true" />
          <span className="max-w-[12rem] truncate">{tag}</span>
          <span className="flex size-5 items-center justify-center rounded-full hover:bg-primary/15">
            <X className="size-3" aria-hidden="true" />
          </span>
        </FilterChip>
      ))}

      {hasFilters ? (
        <button
          type="button"
          onClick={() => void clearFilters()}
          className="ml-1 h-7 shrink-0 rounded-full px-2 text-[13px] whitespace-nowrap text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
