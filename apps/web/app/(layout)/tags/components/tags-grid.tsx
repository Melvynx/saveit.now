"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Typography } from "@workspace/ui/components/typography";
import { Bot, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  useTagsManagement,
  type TagWithCount,
} from "../hooks/use-tags-management";

interface TagsGridProps {
  searchQuery: string;
}

export function TagsGrid({ searchQuery }: TagsGridProps) {
  const router = useRouter();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useTagsManagement(searchQuery);

  const allTags = useMemo(() => {
    return data?.pages.flatMap((page) => page.tags) ?? [];
  }, [data]);

  const handleTagClick = (tagName: string) => {
    router.push(`/app?tags=${encodeURIComponent(tagName)}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {Array.from({ length: 18 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Typography variant="h3" className="text-muted-foreground mb-2">
          Failed to load tags
        </Typography>
        <Typography className="text-sm text-muted-foreground mb-4">
          {error.message}
        </Typography>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (allTags.length === 0) {
    return (
      <div className="text-center py-12">
        <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <Typography variant="h3" className="text-muted-foreground mb-2">
          {searchQuery ? "No tags found" : "No tags yet"}
        </Typography>
        <Typography className="text-sm text-muted-foreground">
          {searchQuery
            ? "Try searching for a different term"
            : "Start adding tags to your bookmarks to see them here"}
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        {allTags.map((tag) => (
          <TagCompactCard
            key={tag.id}
            tag={tag}
            onClick={() => handleTagClick(tag.name)}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

interface TagCompactCardProps {
  tag: TagWithCount;
  onClick: () => void;
}

function TagCompactCard({ tag, onClick }: TagCompactCardProps) {
  const isAI = tag.type === "IA";
  const bookmarkCount = tag._count.bookmarks;

  return (
    <Badge variant="outline" className="rounded-full">
      {isAI ? (
        <Bot className="h-4 w-4 mr-1" />
      ) : (
        <Hash className="h-4 w-4 mr-1" />
      )}
      <Typography as="span" variant="small">
        {tag.name}
      </Typography>
      <Typography as="span" variant="muted">
        {bookmarkCount}
      </Typography>
    </Badge>
  );
}
