"use client";

import { copyToClipboard } from "@/lib/tools/tool-utils";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import type { ToolUIPart, UIMessage } from "ai";
import {
  BookmarkIcon,
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
import { BookmarkCardPage } from "../../bookmark-card/bookmark-card-page";
import type { BookmarkCardData } from "../../bookmark-card/bookmark.types";

type BookmarkData = BookmarkCardData;

type ToolCallInput = {
  query?: string;
  id?: string;
  limit?: number;
  bookmarkIds?: string[];
  bookmarkId?: string;
  title?: string;
  add?: string[];
  remove?: string[];
  types?: string[];
  tags?: string[];
  filters?: string[];
};

type ToolOutput = {
  tagsAdded?: number;
  tagsRemoved?: number;
  bookmarksUpdated?: number;
  addedTags?: string[];
  removedTags?: string[];
};

function ToolCallItem({
  toolName,
  input,
  isCompleted,
  resultCount,
  output,
}: {
  toolName: string;
  input?: ToolCallInput;
  isCompleted?: boolean;
  resultCount?: number;
  output?: ToolOutput;
}) {
  const isSearching = toolName === "searchBookmarks";
  const isGettingDetails = toolName === "getBookmark";
  const isShowingBookmarks = toolName === "showBookmarks";
  const isShowingBookmark = toolName === "showBookmark";
  const isUpdatingTags = toolName === "updateTags";

  const getText = () => {
    if (isSearching) {
      const query = input?.query ? `"${input.query}"` : "";
      const hasFilters =
        (input?.types && input.types.length > 0) ||
        (input?.tags && input.tags.length > 0) ||
        (input?.filters && input.filters.length > 0);

      const filterParts: string[] = [];
      if (input?.types?.length) {
        filterParts.push(input.types.map((t) => t.toLowerCase()).join(", "));
      }
      if (input?.tags?.length) {
        filterParts.push(`#${input.tags.join(", #")}`);
      }
      if (input?.filters?.length) {
        filterParts.push(input.filters.map((f) => f.toLowerCase()).join(", "));
      }
      const filterText = hasFilters ? ` [${filterParts.join(" | ")}]` : "";

      if (isCompleted && resultCount !== undefined) {
        return (
          <>
            <CheckIcon className="text-muted-foreground size-3.5" />
            <span>
              Found {resultCount} result{resultCount === 1 ? "" : "s"} for{" "}
              {query}
              {filterText}
            </span>
          </>
        );
      }
      return (
        <>
          <SearchIcon className="text-muted-foreground size-3.5" />
          <span>
            Searching {query}
            {filterText}
          </span>
        </>
      );
    }
    if (isGettingDetails) {
      if (isCompleted) {
        return (
          <>
            <CheckIcon className="text-muted-foreground size-3.5" />
            <span>Loaded bookmark details</span>
          </>
        );
      }
      return (
        <>
          <Loader2Icon className="text-muted-foreground size-3.5 animate-spin" />
          <span>Loading bookmark details</span>
        </>
      );
    }
    if (isShowingBookmarks) {
      const count = input?.bookmarkIds?.length ?? resultCount ?? 0;
      if (isCompleted) {
        return (
          <>
            <CheckIcon className="text-muted-foreground size-3.5" />
            <span>
              Showing {count} bookmark{count === 1 ? "" : "s"}
            </span>
          </>
        );
      }
      return (
        <>
          <BookmarkIcon className="text-muted-foreground size-3.5" />
          <span>Preparing bookmarks to display</span>
        </>
      );
    }
    if (isShowingBookmark) {
      if (isCompleted) {
        return (
          <>
            <CheckIcon className="text-muted-foreground size-3.5" />
            <span>Showing bookmark</span>
          </>
        );
      }
      return (
        <>
          <BookmarkIcon className="text-muted-foreground size-3.5" />
          <span>Preparing bookmark to display</span>
        </>
      );
    }
    if (isUpdatingTags) {
      const addTags = input?.add ?? [];
      const removeTags = input?.remove ?? [];
      if (isCompleted && output) {
        const parts: string[] = [];
        if (output.addedTags && output.addedTags.length > 0) {
          parts.push(`+${output.addedTags.join(", +")}`);
        }
        if (output.removedTags && output.removedTags.length > 0) {
          parts.push(`-${output.removedTags.join(", -")}`);
        }
        return (
          <>
            <CheckIcon className="text-muted-foreground size-3.5" />
            <span>
              Updated tags on {output.bookmarksUpdated} bookmark
              {output.bookmarksUpdated === 1 ? "" : "s"}
              {parts.length > 0 ? `: ${parts.join(", ")}` : ""}
            </span>
          </>
        );
      }
      const parts: string[] = [];
      if (addTags.length > 0) parts.push(`+${addTags.join(", +")}`);
      if (removeTags.length > 0) parts.push(`-${removeTags.join(", -")}`);
      return (
        <>
          <TagIcon className="text-muted-foreground size-3.5" />
          <span>
            Updating tags{parts.length > 0 ? `: ${parts.join(", ")}` : ""}
          </span>
        </>
      );
    }
    return null;
  };

  const content = getText();
  if (!content) return null;

  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
      {content}
    </div>
  );
}

function BookmarkCardDisplay({ bookmark }: { bookmark: BookmarkData }) {
  return <BookmarkCardPage bookmark={bookmark} />;
}

function BookmarkGridDisplay({
  bookmarks,
  title,
}: {
  bookmarks: BookmarkData[];
  title?: string;
}) {
  if (bookmarks.length === 0) {
    return <p className="text-muted-foreground text-sm">No bookmarks found.</p>;
  }

  return (
    <div className="space-y-3">
      {title && <p className="text-base font-medium">{title}</p>}
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] [&>*]:w-full place-items-start">
        {bookmarks.map((b) => (
          <BookmarkCardDisplay key={b.id} bookmark={b} />
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

  const toolCalls: Array<{
    key: number;
    toolName: string;
    input: ToolCallInput;
    isCompleted: boolean;
    resultCount?: number;
    output?: ToolOutput;
  }> = [];
  const contentParts: Array<{ key: number; element: React.ReactNode }> = [];

  message.parts.forEach((part, i) => {
    if (part.type === "text") {
      contentParts.push({
        key: i,
        element: isUser ? (
          <p className="whitespace-pre-wrap text-sm">{part.text}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <Streamdown>{part.text}</Streamdown>
          </div>
        ),
      });
    } else if (part.type.startsWith("tool-")) {
      const tool = part as ToolUIPart;
      const toolName = part.type.replace("tool-", "");
      const toolInput = (tool as unknown as { input?: ToolCallInput }).input;
      const isCompleted = tool.state === "output-available";

      if (toolName === "searchBookmarks") {
        let resultCount: number | undefined;
        if (isCompleted && tool.output) {
          const output = tool.output;
          if (Array.isArray(output)) {
            resultCount = output.length;
          }
        }
        toolCalls.push({
          key: i,
          toolName,
          input: toolInput ?? {},
          isCompleted,
          resultCount,
        });
      } else if (toolName === "showBookmarks") {
        const bookmarkIdsInput = toolInput?.bookmarkIds ?? [];
        toolCalls.push({
          key: i,
          toolName,
          input: toolInput ?? {},
          isCompleted,
          resultCount: bookmarkIdsInput.length,
        });
        if (isCompleted) {
          const output = tool.output as {
            bookmarks: BookmarkData[];
            title?: string;
          };
          contentParts.push({
            key: i + 0.1,
            element: (
              <BookmarkGridDisplay
                bookmarks={output.bookmarks}
                title={output.title}
              />
            ),
          });
        }
      } else if (toolName === "showBookmark") {
        toolCalls.push({
          key: i,
          toolName,
          input: toolInput ?? {},
          isCompleted,
        });
        if (isCompleted) {
          const output = tool.output as { bookmark: BookmarkData };
          contentParts.push({
            key: i + 0.1,
            element: <BookmarkGridDisplay bookmarks={[output.bookmark]} />,
          });
        }
      } else if (toolName === "getBookmark") {
        toolCalls.push({
          key: i,
          toolName,
          input: toolInput ?? {},
          isCompleted,
        });
      } else if (toolName === "updateTags") {
        const output = isCompleted ? (tool.output as ToolOutput) : undefined;
        toolCalls.push({
          key: i,
          toolName,
          input: toolInput ?? {},
          isCompleted,
          output,
        });
      } else if (!isCompleted) {
        toolCalls.push({
          key: i,
          toolName,
          input: toolInput ?? {},
          isCompleted,
        });
      }
    } else if (part.type === "reasoning") {
      contentParts.push({
        key: i,
        element: (
          <details className="bg-muted/50 mt-2 rounded-lg border">
            <summary className="text-muted-foreground flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
              <BrainIcon className="size-3" />
              <span>Thinking process</span>
            </summary>
            <div className="prose prose-sm dark:prose-invert max-w-none border-t px-3 py-2 text-xs leading-relaxed">
              <Streamdown>{part.text}</Streamdown>
            </div>
          </details>
        ),
      });
    }
  });

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

  return (
    <div
      className={cn(
        "group flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div className={cn("max-w-[85%] space-y-2")}>
        {toolCalls.length > 0 && (
          <div className="flex flex-col gap-1">
            {toolCalls.map(
              ({ key, toolName, input, isCompleted, resultCount, output }) => (
                <ToolCallItem
                  key={key}
                  toolName={toolName}
                  input={input}
                  isCompleted={isCompleted}
                  resultCount={resultCount}
                  output={output}
                />
              ),
            )}
          </div>
        )}

        {contentParts.length > 0 && (
          <div className="relative">
            <div
              className={cn(
                "rounded-2xl px-3 py-2",
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-foreground",
              )}
            >
              {contentParts.map(({ key, element }) => (
                <div key={key}>{element}</div>
              ))}
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
        )}

        {!isUser && isLoading && isLast && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Loader2Icon className="size-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
});
