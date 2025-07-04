import { Badge } from "@workspace/ui/components/badge";
import { BookmarkType } from "../hooks/use-type-filter";
import { Tag } from "../hooks/use-tags";
import { getTypeColor, getTypeDisplayName } from "../utils/type-filter-utils";

interface FilterListProps {
  filteredTypes: BookmarkType[];
  filteredTags: Tag[];
  onSelectType: (type: BookmarkType) => void;
  onSelectTag: (tagName: string) => void;
  showTypes: boolean;
  showTags: boolean;
}

export const FilterList = ({ 
  filteredTypes, 
  filteredTags, 
  onSelectType, 
  onSelectTag, 
  showTypes, 
  showTags 
}: FilterListProps) => {
  const hasItems = (showTypes && filteredTypes.length > 0) || (showTags && filteredTags.length > 0);
  
  if (!hasItems) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Type badges with colors */}
      {showTypes && filteredTypes.map((type) => (
        <Badge
          key={`type-${type}`}
          variant="outline"
          className={`${getTypeColor(type)} cursor-pointer transition-colors`}
          onClick={() => onSelectType(type)}
        >
          {getTypeDisplayName(type)}
        </Badge>
      ))}
      
      {/* Tag badges without colors */}
      {showTags && filteredTags.map((tag) => (
        <Badge
          key={`tag-${tag.id}`}
          variant="outline"
          className="cursor-pointer transition-colors hover:bg-accent"
          onClick={() => onSelectTag(tag.name)}
        >
          #{tag.name}
        </Badge>
      ))}
    </div>
  );
};