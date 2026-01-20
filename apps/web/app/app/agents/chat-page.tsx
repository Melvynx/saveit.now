"use client";

import { upfetch } from "@/lib/up-fetch";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowDownIcon,
  BookmarkIcon,
  CornerDownLeftIcon,
  Loader2Icon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { BookmarkDialog } from "../bookmark-page/bookmark-page";
import { ChatHeader } from "./components/chat-header";
import { MessageItem } from "./components/message-item";

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

const conversationSchema = z.object({
  conversation: z.object({
    id: z.string(),
    title: z.string().nullable(),
    messages: z.array(z.any()),
    updatedAt: z.coerce.date(),
    createdAt: z.coerce.date(),
  }),
});

const createConversationSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(
    searchParams.get("c"),
  );
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null,
  );
  const [isLoadingConversation, setIsLoadingConversation] = useState(
    !!searchParams.get("c"),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef(conversationId);
  const queryClient = useQueryClient();

  const bookmarkId = searchParams.get("b");

  const handleCloseBookmark = useCallback(() => {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev.toString());
        newParams.delete("b");
        return newParams;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev.toString());
        if (conversationId) {
          newParams.set("c", conversationId);
        } else {
          newParams.delete("c");
        }
        return newParams;
      },
      { replace: true },
    );
  }, [conversationId, setSearchParams]);

  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ["chat", "usage"],
    queryFn: () => upfetch("/api/chat/usage", { schema: chatUsageSchema }),
  });

  const createConversationMutation = useMutation({
    mutationFn: (firstMessage: string) =>
      upfetch("/api/chat/conversations", {
        method: "POST",
        body: { firstMessage },
        schema: createConversationSchema,
      }),
    onSuccess: (data) => {
      setConversationId(data.id);
      setConversationTitle(data.title);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const saveMessagesMutation = useMutation({
    mutationFn: ({ id, messages }: { id: string; messages: UIMessage[] }) =>
      upfetch(`/api/chat/conversations/${id}`, {
        method: "PATCH",
        body: { messages },
      }),
  });

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            messages,
            enableThinking: true,
            conversationId: conversationIdRef.current,
          },
        };
      },
    }),
    onFinish: () => {
      void refetchUsage();
    },
    onError: (err) => {
      console.error("[Chat] Error:", err);
    },
  });

  // Load conversation from URL on mount
  useEffect(() => {
    const urlConversationId = searchParams.get("c");
    if (urlConversationId && isLoadingConversation) {
      upfetch(`/api/chat/conversations/${urlConversationId}`, {
        schema: conversationSchema,
      })
        .then((data) => {
          setConversationId(data.conversation.id);
          setConversationTitle(data.conversation.title);
          setMessages(data.conversation.messages as UIMessage[]);
          conversationIdRef.current = data.conversation.id;
        })
        .catch(() => {
          toast.error("Failed to load conversation");
          setSearchParams({}, { replace: true });
        })
        .finally(() => {
          setIsLoadingConversation(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (conversationId && messages.length > 0 && status === "ready") {
      saveMessagesMutation.mutate({ id: conversationId, messages });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages, status]);

  const isGenerating = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isGenerating) return;

    const messageText = input.trim();
    setInput("");
    textareaRef.current?.focus();

    // Create conversation in parallel with sending message
    if (!conversationId) {
      createConversationMutation
        .mutateAsync(messageText)
        .then((result) => {
          conversationIdRef.current = result.id;
        })
        .catch(() => {
          toast.error("Failed to create conversation");
        });
    }

    void sendMessage({ text: messageText }).catch((error) => {
      console.error("Send failed:", error);
      toast.error("Failed to send message");
    });
  }, [
    input,
    isGenerating,
    conversationId,
    createConversationMutation,
    sendMessage,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = useCallback(
    (s: string) => {
      textareaRef.current?.focus();

      // Create conversation in parallel with sending message
      if (!conversationId) {
        createConversationMutation
          .mutateAsync(s)
          .then((result) => {
            conversationIdRef.current = result.id;
          })
          .catch(() => {
            toast.error("Failed to create conversation");
          });
      }

      void sendMessage({ text: s }).catch((error) => {
        console.error("Send failed:", error);
        toast.error("Failed to send message");
      });
    },
    [conversationId, createConversationMutation, sendMessage],
  );

  // Handle ?q= param for auto-submit from agentic search card
  const hasAutoSubmittedRef = useRef(false);
  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam && !hasAutoSubmittedRef.current && !isLoadingConversation) {
      hasAutoSubmittedRef.current = true;
      setSearchParams({}, { replace: true });
      handleSuggestionClick(decodeURIComponent(queryParam));
    }
  }, [
    searchParams,
    isLoadingConversation,
    handleSuggestionClick,
    setSearchParams,
  ]);

  const handleNewConversation = useCallback(() => {
    setConversationId(null);
    setConversationTitle(null);
    setMessages([]);
    setInput("");
    conversationIdRef.current = null;
    setSearchParams({}, { replace: true });
  }, [setMessages, setSearchParams]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      try {
        const data = await upfetch(`/api/chat/conversations/${id}`, {
          schema: conversationSchema,
        });
        setConversationId(data.conversation.id);
        setConversationTitle(data.conversation.title);
        setMessages(data.conversation.messages as UIMessage[]);
        conversationIdRef.current = data.conversation.id;
      } catch {
        toast.error("Failed to load conversation");
      }
    },
    [setMessages],
  );

  const handleEditMessage = useCallback(
    (messageId: string, newContent: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      const originalMessage = messages[messageIndex];
      if (messageIndex === -1 || !originalMessage) return;

      const updatedMessages = messages.slice(0, messageIndex);
      const editedMessage: UIMessage = {
        ...originalMessage,
        parts: [{ type: "text", text: newContent }],
      };
      updatedMessages.push(editedMessage);

      setMessages(updatedMessages);

      void sendMessage({ text: newContent }).catch((error) => {
        console.error("Send failed:", error);
        toast.error("Failed to send message");
      });
    },
    [messages, setMessages, sendMessage],
  );

  const handleClearInput = () => {
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-muted fixed inset-0 flex flex-col">
      <ChatHeader
        conversationId={conversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden">
        <div className="flex min-h-0 w-full max-w-3xl flex-1 flex-col">
          {messages.length === 0 ? (
            <EmptyState onSuggestionClick={handleSuggestionClick} />
          ) : (
            <StickToBottom
              className="relative min-h-0 flex-1 overflow-y-auto"
              initial="smooth"
              resize="smooth"
            >
              <StickToBottom.Content className="flex flex-col gap-3 p-4">
                {messages.map((m, i) => (
                  <MessageItem
                    key={m.id}
                    message={m}
                    isLast={i === messages.length - 1}
                    isLoading={isGenerating}
                    onEdit={handleEditMessage}
                  />
                ))}
              </StickToBottom.Content>
              <ScrollButton />
            </StickToBottom>
          )}

          <div className="p-3">
            <div
              className={cn(
                "rounded-2xl",
                "border-2 border-primary",
                "shadow-[0_0_40px_rgba(59,130,246,0.4)]",
                "flex items-center gap-1 p-1.5",
              )}
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your bookmarks..."
                className="min-h-[36px] max-h-[120px] flex-1 resize-none border-0 !bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0"
                rows={1}
                disabled={isGenerating && status !== "streaming"}
              />
              <div className="flex items-center gap-1">
                {input.trim() && !isGenerating && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg"
                    onClick={handleClearInput}
                  >
                    <XIcon className="size-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  className="size-8 rounded-lg"
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
            <div className="mt-2 flex justify-center">
              <CreditsDisplay credits={usage ?? null} />
            </div>
          </div>
        </div>
      </div>

      {bookmarkId && (
        <BookmarkDialog bookmarkId={bookmarkId} onClose={handleCloseBookmark} />
      )}
    </div>
  );
}

export { ChatPage as AgentsPage };
