"use client";

import { upfetch } from "@/lib/up-fetch";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport, type ToolUIPart, type UIMessage } from "ai";
import {
  ArrowDownIcon,
  BookmarkIcon,
  BrainIcon,
  CornerDownLeftIcon,
  Loader2Icon,
  SquareIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { BookmarkHeader } from "../bookmark-header";
import { BookmarkCardPage } from "../bookmark-card/bookmark-card-page";
import type { BookmarkCardData } from "../bookmark-card/bookmark.types";

type BookmarkData = BookmarkCardData;

const SUGGESTIONS = [
  "Search my bookmarks",
  "Show me recent articles",
  "Find programming resources",
  "What have I saved about React?",
];

const chatUsageSchema = z.object({
  used: z.number(),
  limit: z.number(),
  remaining: z.number(),
  plan: z.string(),
});

function getDisplayUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "Unknown";
  }
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
      <div className="grid gap-4 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] [&>*]:w-full place-items-start">
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
};

const MessageItem = memo(function MessageItem({
  message,
  isLast,
  isLoading,
}: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border text-foreground",
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap text-sm">
                {part.text}
              </p>
            );
          }

          if (part.type.startsWith("tool-")) {
            const tool = part as ToolUIPart;
            const toolName = part.type.replace("tool-", "");

            if (
              toolName === "showBookmarks" &&
              tool.state === "output-available"
            ) {
              const output = tool.output as {
                bookmarks: BookmarkData[];
                title?: string;
              };
              return (
                <BookmarkGridDisplay
                  key={i}
                  bookmarks={output.bookmarks}
                  title={output.title}
                />
              );
            }

            if (
              toolName === "showBookmark" &&
              tool.state === "output-available"
            ) {
              const output = tool.output as { bookmark: BookmarkData };
              return <BookmarkCardDisplay key={i} bookmark={output.bookmark} />;
            }

            if (
              toolName === "searchBookmarks" &&
              tool.state === "output-available"
            ) {
              const output = tool.output as BookmarkData[];
              if (Array.isArray(output) && output.length > 0) {
                return (
                  <BookmarkGridDisplay
                    key={i}
                    bookmarks={output}
                    title={`Found ${output.length} bookmark${output.length > 1 ? "s" : ""}`}
                  />
                );
              }
              return (
                <p key={i} className="text-muted-foreground text-sm">
                  No bookmarks found.
                </p>
              );
            }

            if (
              toolName === "getBookmark" &&
              tool.state === "output-available"
            ) {
              const output = tool.output as BookmarkData | { error: string };
              if ("error" in output) {
                return (
                  <p key={i} className="text-muted-foreground text-sm">
                    {output.error}
                  </p>
                );
              }
              return <BookmarkCardDisplay key={i} bookmark={output} />;
            }

            if (tool.state === "input-available") {
              return (
                <div
                  key={i}
                  className="text-muted-foreground flex items-center gap-2 text-xs"
                >
                  <Loader2Icon className="size-3 animate-spin" />
                  Running {toolName}...
                </div>
              );
            }

            return null;
          }

          if (part.type === "reasoning") {
            return (
              <details key={i} className="mt-2">
                <summary className="text-muted-foreground cursor-pointer text-xs">
                  Thinking...
                </summary>
                <p className="text-muted-foreground mt-1 text-xs">
                  {part.text}
                </p>
              </details>
            );
          }

          return null;
        })}
        {!isUser && isLoading && isLast && (
          <div className="flex items-center gap-2 pt-1">
            <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});

function EmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick: (s: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <BookmarkIcon className="text-muted-foreground size-8" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">SaveIt Chat</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Ask me anything about your bookmarks
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onSuggestionClick(s)}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ScrollButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;

  return (
    <Button
      size="icon"
      variant="outline"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full"
      onClick={() => scrollToBottom()}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
}

function ThinkingToggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(!enabled)}
          disabled={disabled}
          className={cn(
            "h-7 gap-1 rounded px-2 text-muted-foreground hover:text-foreground",
            enabled &&
              "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
          )}
          aria-label="Toggle thinking mode"
        >
          <BrainIcon className="size-3" />
          {enabled && <span className="text-[10px] font-medium">2x</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{enabled ? "Thinking mode enabled" : "Enable thinking mode"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function CreditsDisplay({
  credits,
}: {
  credits: { used: number; limit: number; remaining: number } | null;
}) {
  if (!credits) return null;

  return (
    <span
      className={cn(
        "text-muted-foreground text-[11px] tabular-nums",
        credits.remaining <= 3 && "text-destructive",
      )}
    >
      {credits.used}/{credits.limit}
    </span>
  );
}

export function ChatPage() {
  const [input, setInput] = useState("");
  const [enableThinking, setEnableThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const enableThinkingRef = useRef(enableThinking);

  useEffect(() => {
    enableThinkingRef.current = enableThinking;
  }, [enableThinking]);

  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ["chat", "usage"],
    queryFn: () => upfetch("/api/chat/usage", { schema: chatUsageSchema }),
  });

  const { messages, sendMessage, status, stop, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            messages,
            enableThinking: enableThinkingRef.current,
          },
        };
      },
    }),
    onFinish: () => {
      void refetchUsage();
    },
    onToolCall: async ({ toolCall }) => {
      try {
        if (toolCall.toolName === "showBookmarks") {
          const toolInput = (
            toolCall as { input: { bookmarks: BookmarkData[]; title?: string } }
          ).input;
          addToolOutput({
            tool: "showBookmarks",
            toolCallId: toolCall.toolCallId,
            output: { bookmarks: toolInput.bookmarks, title: toolInput.title },
          });
        } else if (toolCall.toolName === "showBookmark") {
          const toolInput = (toolCall as { input: { bookmark: BookmarkData } })
            .input;
          addToolOutput({
            tool: "showBookmark",
            toolCallId: toolCall.toolCallId,
            output: { bookmark: toolInput.bookmark },
          });
        }
      } catch (error) {
        console.error("Tool call failed:", error);
        toast.error("Failed to display bookmark");
      }
    },
  });

  const isGenerating = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isGenerating) return;
    void sendMessage({ text: input }).catch((error) => {
      console.error("Send failed:", error);
      toast.error("Failed to send message");
    });
    setInput("");
  }, [input, isGenerating, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = useCallback(
    (s: string) => {
      void sendMessage({ text: s }).catch((error) => {
        console.error("Send failed:", error);
        toast.error("Failed to send message");
      });
    },
    [sendMessage],
  );

  return (
    <div
      className="mx-auto flex w-screen flex-col gap-4 px-4 py-4 lg:px-12"
      style={{ maxWidth: 3000 }}
    >
      <BookmarkHeader />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <div className="bg-card flex min-h-[60vh] flex-col rounded-xl border">
          {messages.length === 0 ? (
            <EmptyState onSuggestionClick={handleSuggestionClick} />
          ) : (
            <StickToBottom
              className="relative flex-1 overflow-y-auto"
              initial="smooth"
              resize="smooth"
            >
              <StickToBottom.Content className="flex flex-col gap-4 p-4">
                {messages.map((m, i) => (
                  <MessageItem
                    key={m.id}
                    message={m}
                    isLast={i === messages.length - 1}
                    isLoading={isGenerating}
                  />
                ))}
              </StickToBottom.Content>
              <ScrollButton />
            </StickToBottom>
          )}

          {/* Input area */}
          <div className="p-3">
            <div className="bg-card rounded-xl border">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your bookmarks..."
                className="min-h-[36px] resize-none border-0 bg-transparent px-3.5 py-2.5 text-sm shadow-none focus-visible:ring-0"
                rows={1}
                disabled={isGenerating && status !== "streaming"}
              />
              <div className="flex items-center justify-between gap-1.5 px-2 pb-2">
                <div className="flex items-center gap-1.5">
                  <ThinkingToggle
                    enabled={enableThinking}
                    onChange={setEnableThinking}
                    disabled={isGenerating}
                  />
                  <CreditsDisplay credits={usage ?? null} />
                </div>
                <Button
                  size="icon"
                  className="size-7 rounded"
                  onClick={isGenerating ? () => stop() : handleSubmit}
                  disabled={!isGenerating && !input.trim()}
                >
                  {isGenerating && status === "streaming" ? (
                    <SquareIcon className="size-4" />
                  ) : isGenerating ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CornerDownLeftIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
