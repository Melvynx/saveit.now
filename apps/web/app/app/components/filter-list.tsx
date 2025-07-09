import { Badge } from "@workspace/ui/components/badge";
import { getTypeColor, getTypeDisplayName, getSpecialFilterColor, getSpecialFilterDisplayName } from "../utils/type-filter-utils";
import { useSearchInput } from "../contexts/search-input-context";

export const FilterList = ({ query }: { query?: string }) => {
  const { 
    filteredTypes, 
    filteredTags, 
    filteredSpecialFilters,
    addType, 
    addTag, 
    addSpecialFilter,
    showTypeList, 
    showTagList,
    showSpecialList
  } = useSearchInput();
  
  const hasItems = (showTypeList && filteredTypes.length > 0) || (showTagList && filteredTags.length > 0) || (showSpecialList && filteredSpecialFilters.length > 0);
  
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
      
      {/* Special filter badges with colors */}
      {showSpecialList && filteredSpecialFilters.map((filter) => (
        <Badge
          key={`special-${filter}`}
          variant="outline"
          className={`${getSpecialFilterColor(filter)} cursor-pointer transition-colors`}
          onClick={() => addSpecialFilter(filter, query)}
        >
          {getSpecialFilterDisplayName(filter)}
        </Badge>
      ))}
    </div>
  );
};