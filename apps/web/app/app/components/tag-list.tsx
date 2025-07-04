import { Badge } from "@workspace/ui/components/badge";
import { Tag } from "../hooks/use-tags";

interface TagListProps {
  filteredTags: Tag[];
  onSelectTag: (tagName: string) => void;
  show: boolean;
}

export const TagList = ({ filteredTags, onSelectTag, show }: TagListProps) => {
  if (!show || filteredTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filteredTags.map((tag) => (
        <Badge
          key={tag.id}
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