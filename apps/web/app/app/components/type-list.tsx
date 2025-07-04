import { Badge } from "@workspace/ui/components/badge";
import { BookmarkType } from "@workspace/database";
import { getTypeColor, getTypeDisplayName } from "../utils/type-filter-utils";

interface TypeListProps {
  filteredTypes: BookmarkType[];
  onSelectType: (type: BookmarkType) => void;
  show: boolean;
}

export const TypeList = ({
  filteredTypes,
  onSelectType,
  show,
}: TypeListProps) => {
  if (!show || filteredTypes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filteredTypes.map((type) => (
        <Badge
          key={type}
          variant="outline"
          className={`${getTypeColor(type)} cursor-pointer transition-colors`}
          onClick={() => onSelectType(type)}
        >
          {getTypeDisplayName(type)}
        </Badge>
      ))}
    </div>
  );
};
