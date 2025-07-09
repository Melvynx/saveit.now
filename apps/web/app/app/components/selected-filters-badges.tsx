import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { X } from "lucide-react";
import { getTypeColor, getTypeDisplayName, getSpecialFilterColor, getSpecialFilterDisplayName } from "../utils/type-filter-utils";
import { useSearchInput } from "../contexts/search-input-context";

export const SelectedFiltersBadges = () => {
  const { selectedTypes, selectedTags, selectedSpecialFilters, removeType, removeTag, removeSpecialFilter } = useSearchInput();
  const hasFilters = selectedTypes.length > 0 || selectedTags.length > 0 || selectedSpecialFilters.length > 0;
  
  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {/* Type badges with colors */}
      {selectedTypes.map((type) => (
        <Badge
          key={`type-${type}`}
          variant="outline"
          className={`${getTypeColor(type)} flex items-center gap-1 px-2 py-1`}
        >
          {getTypeDisplayName(type)}
          <Button
            variant="ghost"
            size="sm"
            className="size-4 hover:bg-transparent"
            onClick={() => removeType(type)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      
      {/* Tag badges without colors */}
      {selectedTags.map((tag) => (
        <Badge
          key={`tag-${tag}`}
          variant="outline"
          className="flex items-center gap-1 px-2 py-1"
        >
          #{tag}
          <Button
            variant="ghost"
            size="sm"
            className="size-4 hover:bg-transparent"
            onClick={() => removeTag(tag)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      
      {/* Special filter badges with colors */}
      {selectedSpecialFilters.map((filter) => (
        <Badge
          key={`special-${filter}`}
          variant="outline"
          className={`${getSpecialFilterColor(filter)} flex items-center gap-1 px-2 py-1`}
        >
          {getSpecialFilterDisplayName(filter)}
          <Button
            variant="ghost"
            size="sm"
            className="size-4 hover:bg-transparent"
            onClick={() => removeSpecialFilter(filter)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
};