/* eslint-disable @next/next/no-img-element */
import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { LucideIcon, Sparkle, TagIcon, Hash, Plus } from "lucide-react";

import { BookmarkViewType } from "@/lib/database/get-bookmark";
import { BookmarkFavicon } from "app/app/bookmark-favicon";
import { BookmarkNote } from "app/app/bookmark-page/bookmark-note";
import { ExternalLinkTracker } from "app/app/external-link-tracker";
import { BookmarkPreview } from "./bookmark-preview";
import { TranscriptViewer } from "./transcript-viewer";
import { TagSelector } from "@/features/tags/tag-selector";
import { useAction } from "next-safe-action/hooks";
import { updateBookmarkTagsAction } from "app/app/bookmark-page/bookmarks.action";
import { useRefreshBookmarks } from "app/app/use-bookmarks";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";

export const BookmarkContentView = ({
  bookmark,
  isPublic = false,
}: {
  bookmark: BookmarkViewType;
  isPublic?: boolean;
}) => {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const refreshBookmarks = useRefreshBookmarks();

  const { execute: updateTags, isExecuting } = useAction(
    updateBookmarkTagsAction,
    {
      onSuccess: () => {
        toast.success("Tags updated");
        refreshBookmarks();
        setIsEditingTags(false);
      },
      onError: (error) => {
        toast.error(
          error.error.serverError?.message || "Failed to update tags",
        );
      },
    },
  );

  // Extract transcript data from metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = bookmark.metadata as Record<string, any> | null;
  const transcript = metadata?.transcript as string | undefined;

  const aiTags = bookmark.tags.filter((tag) => tag.tag.type === "IA");
  const userTags = bookmark.tags.filter((tag) => tag.tag.type === "USER");
  const allTagNames = bookmark.tags.map((tag) => tag.tag.name);

  const handleTagsChange = (newTagNames: string[]) => {
    updateTags({ bookmarkId: bookmark.id, tags: newTagNames });
  };
  return (
    <main className="flex flex-col gap-4">
      <Card className="p-0 h-24 overflow-hidden flex flex-row items-center">
        <div className="flex items-start gap-2 p-4">
          <div className="flex size-8 items-center justify-center rounded border shrink-0">
            <BookmarkFavicon
              faviconUrl={bookmark.faviconUrl ?? undefined}
              bookmarkType={bookmark.type ?? "BLOG"}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ExternalLinkTracker bookmarkId={bookmark.id} url={bookmark.url}>
              <Typography
                variant="large"
                className="line-clamp-1 cursor-pointer hover:underline"
              >
                {bookmark.url}
              </Typography>
            </ExternalLinkTracker>
            <Typography variant="muted">{bookmark.title}</Typography>
          </div>
        </div>
        {bookmark.ogImageUrl && (
          <div className="h-full ml-auto">
            <img
              src={bookmark.ogImageUrl}
              alt="og-image"
              className="rounded-md h-full max-h-24 w-auto"
              width={200}
              height={96}
            />
          </div>
        )}
      </Card>
      <Card className="p-4">
        <BookmarkSectionTitle icon={Sparkle} text="Summary" />
        <div className="flex flex-col gap-2">
          <Typography variant="muted">
            {bookmark.summary || "No summary generated"}
          </Typography>
        </div>
      </Card>

      {/* YouTube Transcript Section */}
      {bookmark.type === "YOUTUBE" && transcript && (
        <TranscriptViewer transcript={transcript} />
      )}
      <BookmarkPreview bookmark={bookmark} isPublic={isPublic} />
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <BookmarkSectionTitle icon={TagIcon} text="Tags" />
          {!isPublic && !isEditingTags && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditingTags(true)}
            >
              <Plus className="size-4 mr-1" />
              Edit tags
            </Button>
          )}
        </div>

        {isEditingTags && !isPublic ? (
          <div className="space-y-4">
            <TagSelector
              selectedTags={allTagNames}
              onTagsChange={handleTagsChange}
              placeholder="Search or create tags..."
              disabled={isExecuting}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditingTags(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {aiTags.length > 0 && (
              <div className="flex flex-col gap-2">
                <Typography variant="muted">AI Generated</Typography>
                <div className="flex flex-wrap gap-2">
                  {aiTags.map((tag) => (
                    <Badge
                      key={tag.tag.id}
                      variant="outline"
                      className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                    >
                      <Hash className="size-3 mr-1" />
                      {tag.tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {userTags.length > 0 && (
              <div className="flex flex-col gap-2">
                <Typography variant="muted">Custom Tags</Typography>
                <div className="flex flex-wrap gap-2">
                  {userTags.map((tag) => (
                    <Badge key={tag.tag.id} variant="secondary">
                      <Hash className="size-3 mr-1" />
                      {tag.tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {bookmark.tags.length === 0 && (
              <Typography variant="muted">No tags yet</Typography>
            )}
          </div>
        )}
      </Card>
      {!isPublic && (
        <BookmarkNote note={bookmark.note} bookmarkId={bookmark.id} />
      )}
    </main>
  );
};

export const BookmarkSectionTitle = (props: {
  icon: LucideIcon;
  text: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <props.icon className="text-primary size-4" />
      <Typography variant="muted">{props.text}</Typography>
    </div>
  );
};
