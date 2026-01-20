"use client";

import { copyToClipboard } from "@/lib/tools/tool-utils";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import type { ToolUIPart, UIMessage } from "ai";
import {
  BrainIcon,
  CheckIcon,
  CopyIcon,
  Loader2Icon,
  PencilIcon,
  SearchIcon,
  TagIcon,
} from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { BookmarkCard } from "../../bookmark-card";
import type { BookmarkCardData } from "../../bookmark-card/bookmark.types";

type BookmarkData = BookmarkCardData;

function BookmarkGridDisplay({ bookmarks }: { bookmarks: BookmarkData[] }) {
  if (bookmarks.length === 0) {
    return <p className="text-muted-foreground text-sm">No bookmarks found.</p>;
  }

  const shouldBreakout = bookmarks.length >= 4;

  return (
    <div
      className={cn(
        "relative",
        "w-full",
        shouldBreakout && "lg:w-[140%] lg:-ml-[20%]",
        shouldBreakout && "xl:w-[160%] xl:-ml-[30%]",
        shouldBreakout && "2xl:w-[180%] 2xl:-ml-[40%]",
      )}
    >
      <div className="flex flex-wrap justify-center gap-3 [&>*]:w-full [&>*]:sm:w-72 [&>*]:lg:w-80">
        {bookmarks.map((b) => (
          <BookmarkCard key={b.id} bookmark={b} />
        ))}
      </div>
    </div>
  );
}

type MessageItemProps = {
  message: UIMessage;
  isLast: boolean;
  isLoading: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
};

export const MessageItem = memo(function MessageItem({
  message,
  isLast,
  isLoading,
  onEdit,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [copied, setCopied] = useState(false);

  const getTextContent = () => {
    const textPart = message.parts.find((p) => p.type === "text");
    return textPart?.type === "text" ? textPart.text : "";
  };

  const handleCopy = async () => {
    const text = getTextContent();
    if (!text) return;

    try {
      await copyToClipboard(text);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleStartEdit = () => {
    setEditContent(getTextContent());
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
    setEditContent("");
  };

  if (isEditing && isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] space-y-2">
          <div className="bg-muted rounded-xl border p-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] resize-none border-0 bg-transparent text-sm focus-visible:ring-0"
              autoFocus
            />
            <div className="flex justify-end gap-1 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                className="h-7 px-2"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="h-7 px-2"
                disabled={!editContent.trim()}
              >
                Save & Resend
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasContent = message.parts.some(
    (p) =>
      p.type === "text" ||
      p.type === "reasoning" ||
      (p.type.startsWith("tool-") &&
        (p as ToolUIPart).state === "output-available"),
  );

  return (
    <div className="group flex w-full flex-col gap-3">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div
              key={index}
              className={cn(
                "flex w-full",
                isUser ? "justify-end" : "justify-start",
              )}
            >
              <div className="relative max-w-[85%]">
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground",
                  )}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-sm">{part.text}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <Streamdown>{part.text}</Streamdown>
                    </div>
                  )}
                </div>

                {isUser ? (
                  <div className="absolute right-full top-0 mr-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <CheckIcon className="size-3 text-green-500" />
                      ) : (
                        <CopyIcon className="size-3" />
                      )}
                    </Button>
                    {onEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6"
                        onClick={handleStartEdit}
                      >
                        <PencilIcon className="size-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 gap-1 px-2 text-xs"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <CheckIcon className="size-3 text-green-500" />
                      ) : (
                        <CopyIcon className="size-3" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (part.type === "reasoning") {
          return (
            <details key={index}>
              <summary className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-sm list-none [&::-webkit-details-marker]:hidden">
                <BrainIcon className="size-3.5" />
                <span>Thinking process</span>
              </summary>
              <div className="bg-muted/50 mt-2 max-w-[85%] rounded-lg border px-3 py-2">
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                  <Streamdown>{part.text}</Streamdown>
                </div>
              </div>
            </details>
          );
        }

        if (part.type.startsWith("tool-")) {
          const tool = part as ToolUIPart;
          const toolName = part.type.replace("tool-", "");
          const isCompleted = tool.state === "output-available";
          const toolInput = (
            tool as unknown as { input?: Record<string, unknown> }
          ).input;

          if (toolName === "searchBookmarks") {
            const query = (toolInput?.query as string) ?? "";
            const types = (toolInput?.types as string[]) ?? [];
            const tags = (toolInput?.tags as string[]) ?? [];
            const filters = (toolInput?.filters as string[]) ?? [];

            const hasFilters =
              types.length > 0 || tags.length > 0 || filters.length > 0;

            const filterParts: string[] = [];
            if (types.length) {
              filterParts.push(types.map((t) => t.toLowerCase()).join(", "));
            }
            if (tags.length) {
              filterParts.push(`#${tags.join(", #")}`);
            }
            if (filters.length) {
              filterParts.push(filters.map((f) => f.toLowerCase()).join(", "));
            }
            const filterText = hasFilters
              ? ` [${filterParts.join(" | ")}]`
              : "";

            let resultCount: number | undefined;
            if (isCompleted && tool.output && Array.isArray(tool.output)) {
              resultCount = tool.output.length;
            }

            return (
              <div
                key={index}
                className="text-muted-foreground flex items-center gap-1.5 text-sm"
              >
                {isCompleted ? (
                  <>
                    <CheckIcon className="size-3.5" />
                    <span>
                      Found {resultCount ?? 0} result
                      {resultCount === 1 ? "" : "s"} for "{query}"{filterText}
                    </span>
                  </>
                ) : (
                  <>
                    <SearchIcon className="size-3.5" />
                    <span>
                      Searching "{query}"{filterText}
                    </span>
                  </>
                )}
              </div>
            );
          }

          if (toolName === "showBookmarks" && isCompleted) {
            const output = tool.output as { bookmarks: BookmarkData[] };
            return (
              <div key={index} className="w-full">
                <BookmarkGridDisplay bookmarks={output.bookmarks} />
              </div>
            );
          }

          if (toolName === "showBookmark" && isCompleted) {
            const output = tool.output as { bookmark: BookmarkData };
            return (
              <div key={index} className="w-full">
                <BookmarkGridDisplay bookmarks={[output.bookmark]} />
              </div>
            );
          }

          if (toolName === "getBookmark") {
            return (
              <div
                key={index}
                className="text-muted-foreground flex items-center gap-1.5 text-sm"
              >
                {isCompleted ? (
                  <>
                    <CheckIcon className="size-3.5" />
                    <span>Loaded bookmark details</span>
                  </>
                ) : (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin" />
                    <span>Loading bookmark details</span>
                  </>
                )}
              </div>
            );
          }

          if (toolName === "updateTags") {
            const addTags = (toolInput?.add as string[]) ?? [];
            const removeTags = (toolInput?.remove as string[]) ?? [];
            const output = isCompleted
              ? (tool.output as {
                  tagsAdded?: number;
                  tagsRemoved?: number;
                  bookmarksUpdated?: number;
                  addedTags?: string[];
                  removedTags?: string[];
                })
              : undefined;

            if (isCompleted && output) {
              const parts: string[] = [];
              if (output.addedTags && output.addedTags.length > 0) {
                parts.push(`+${output.addedTags.join(", +")}`);
              }
              if (output.removedTags && output.removedTags.length > 0) {
                parts.push(`-${output.removedTags.join(", -")}`);
              }
              return (
                <div
                  key={index}
                  className="text-muted-foreground flex items-center gap-1.5 text-sm"
                >
                  <CheckIcon className="size-3.5" />
                  <span>
                    Updated tags on {output.bookmarksUpdated} bookmark
                    {output.bookmarksUpdated === 1 ? "" : "s"}
                    {parts.length > 0 ? `: ${parts.join(", ")}` : ""}
                  </span>
                </div>
              );
            }

            const parts: string[] = [];
            if (addTags.length > 0) parts.push(`+${addTags.join(", +")}`);
            if (removeTags.length > 0) parts.push(`-${removeTags.join(", -")}`);

            return (
              <div
                key={index}
                className="text-muted-foreground flex items-center gap-1.5 text-sm"
              >
                <TagIcon className="size-3.5" />
                <span>
                  Updating tags{parts.length > 0 ? `: ${parts.join(", ")}` : ""}
                </span>
              </div>
            );
          }

          return null;
        }

        return null;
      })}

      {!isUser && isLoading && isLast && !hasContent && (
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Loader2Icon className="size-3.5 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}
    </div>
  );
});
