import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { X } from "lucide-react";
import { BookmarkType } from "../hooks/use-type-filter";
import { getTypeColor, getTypeDisplayName } from "../utils/type-filter-utils";

interface SelectedFiltersBadgesProps {
  selectedTypes: BookmarkType[];
  selectedTags: string[];
  onRemoveType: (type: BookmarkType) => void;
  onRemoveTag: (tag: string) => void;
}

export const SelectedFiltersBadges = ({ 
  selectedTypes, 
  selectedTags, 
  onRemoveType, 
  onRemoveTag 
}: SelectedFiltersBadgesProps) => {
  const hasFilters = selectedTypes.length > 0 || selectedTags.length > 0;
  
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
            onClick={() => onRemoveType(type)}
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
            onClick={() => onRemoveTag(tag)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
};