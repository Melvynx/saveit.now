import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Tag } from "../hooks/use-tags";

interface TagListProps {
  filteredTags: Tag[];
  onSelectTag: (tagName: string) => void;
  show: boolean;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const TagList = ({ 
  filteredTags, 
  onSelectTag, 
  show, 
  isLoading = false,
  error = null,
  onRetry 
}: TagListProps) => {
  if (!show) return null;

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-destructive bg-destructive/10 rounded-md">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load tags</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-auto h-6 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Loading tags...</span>
      </div>
    );
  }

  if (filteredTags.length === 0) {
    return (
      <div className="p-2 text-sm text-muted-foreground">
        No tags found
      </div>
    );
  }

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