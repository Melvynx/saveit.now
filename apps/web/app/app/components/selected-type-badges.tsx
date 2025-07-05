import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { X } from "lucide-react";
import { BookmarkType } from "@workspace/database";
import { getTypeColor, getTypeDisplayName } from "../utils/type-filter-utils";

interface SelectedTypeBadgesProps {
  selectedTypes: BookmarkType[];
  onRemoveType: (type: BookmarkType) => void;
}

export const SelectedTypeBadges = ({
  selectedTypes,
  onRemoveType,
}: SelectedTypeBadgesProps) => {
  if (selectedTypes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {selectedTypes.map((type) => (
        <Badge
          key={type}
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
    </div>
  );
};
