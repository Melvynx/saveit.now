import { Badge } from "@workspace/ui/components/badge";
import { getTypeColor, getTypeDisplayName } from "../utils/type-filter-utils";
import { useSearchInput } from "../contexts/search-input-context";

export const FilterList = () => {
  const { 
    filteredTypes, 
    filteredTags, 
    addType, 
    addTag, 
    showTypeList, 
    showTagList 
  } = useSearchInput();
  
  const hasItems = (showTypeList && filteredTypes.length > 0) || (showTagList && filteredTags.length > 0);
  
  if (!hasItems) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Type badges with colors */}
      {showTypeList && filteredTypes.map((type) => (
        <Badge
          key={`type-${type}`}
          variant="outline"
          className={`${getTypeColor(type)} cursor-pointer transition-colors`}
          onClick={() => addType(type)}
        >
          {getTypeDisplayName(type)}
        </Badge>
      ))}
      
      {/* Tag badges without colors */}
      {showTagList && filteredTags.map((tag) => (
        <Badge
          key={`tag-${tag.id}`}
          variant="outline"
          className="cursor-pointer transition-colors hover:bg-accent"
          onClick={() => addTag(tag.name)}
        >
          #{tag.name}
        </Badge>
      ))}
    </div>
  );
};