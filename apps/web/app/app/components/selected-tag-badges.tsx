import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { X } from "lucide-react";

interface SelectedTagBadgesProps {
  selectedTags: string[];
  onRemoveTag: (tag: string) => void;
}

export const SelectedTagBadges = ({ selectedTags, onRemoveTag }: SelectedTagBadgesProps) => {
  if (selectedTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {selectedTags.map((tag) => (
        <Badge
          key={tag}
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