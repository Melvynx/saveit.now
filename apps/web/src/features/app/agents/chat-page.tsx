"use client";

import { authClient } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useChat } from "@ai-sdk/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useAction, useConvex, useConvexAuth, useMutation } from "convex/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowDownIcon,
  BookmarkIcon,
  CornerDownLeftIcon,
  Loader2Icon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { BookmarkDialog } from "../bookmark-page/bookmark-page";
import { ChatHeader } from "./components/chat-header";
import { MessageItem } from "./components/message-item";
import { getConvexSiteUrl } from "@/lib/convex-url";

const CONVEX_SITE_URL = getConvexSiteUrl();

const SUGGESTIONS = [
  "Search my bookmarks",
  "Show me recent articles",
  "Find programming resources",
  "What have I saved about React?",
];

function getFirstUserMessageText(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const textPart = firstUserMessage?.parts.find((part) => part.type === "text");

  return textPart?.type === "text" && textPart.text.trim()
    ? textPart.text.trim()
    : "New conversation";
}

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
  const navigate = useNavigate();
  const routeSearch = useSearch({ strict: false }) as Record<
    string,
    string | undefined
  >;
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();

    Object.entries(routeSearch).forEach(([key, value]) => {
      if (typeof value === "string") {
        params.set(key, value);
      }
    });

    return params;
  }, [routeSearch]);
  const setSearchParams = useCallback(
    (
      next:
        | Record<string, string>
        | ((previous: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean },
    ) => {
      void navigate({
        to: "/app/agents" as any,
        // Functional updater: always derive from the router's live search
        // state, never from a React-closure snapshot (a stale snapshot
        // taken during hydration can drop params like `b`).
        search: ((current: Record<string, unknown>) => {
          const params = new URLSearchParams();
          Object.entries(current ?? {}).forEach(([key, value]) => {
            if (typeof value === "string") {
              params.set(key, value);
            }
          });
          const nextParams =
            typeof next === "function" ? next(params) : new URLSearchParams(next);
          return Object.fromEntries(nextParams.entries());
        }) as any,
        replace: options?.replace,
      });
    },
    [navigate],
  );
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(
    searchParams.get("c"),
  );
  const [isLoadingConversation, setIsLoadingConversation] = useState(
    !!searchParams.get("c"),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef(conversationId);
  const conversationCreationPromiseRef = useRef<Promise<string> | null>(null);
  const conversationVersionRef = useRef(0);
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const [isRatingConversation, setIsRatingConversation] = useState(false);

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

  // Convex reactive query for chat usage
  const usage = useAuthedQuery(api.chat.queries.getChatUsage, {});

  // Convex action for creating a conversation with AI-generated title
  const createConversation = useAction(
    api.chat.actions.createConversationWithTitle,
  );

  const ensureConversationForFirstMessage = useCallback(
    async (firstMessage: string) => {
      if (conversationIdRef.current) {
        return conversationIdRef.current;
      }

      if (!conversationCreationPromiseRef.current) {
        const version = conversationVersionRef.current;

        conversationCreationPromiseRef.current = createConversation({
          firstMessage,
        })
          .then((data) => {
            const nextConversationId = data.id;

            if (
              conversationVersionRef.current === version &&
              !conversationIdRef.current
            ) {
              conversationIdRef.current = nextConversationId;
              setConversationId(nextConversationId);
            }

            return nextConversationId;
          })
          .finally(() => {
            if (conversationVersionRef.current === version) {
              conversationCreationPromiseRef.current = null;
            }
          });
      }

      return await conversationCreationPromiseRef.current;
    },
    [createConversation],
  );

  // Convex mutation for liking a conversation
  const likeConversation = useMutation(api.chat.mutations.likeConversation);

  // Convex mutation for disliking a conversation
  const dislikeConversation = useMutation(
    api.chat.mutations.dislikeConversation,
  );

  const handleLike = useCallback(() => {
    if (conversationId && !isRatingConversation) {
      setIsRatingConversation(true);
      void likeConversation({
        conversationId: conversationId as Id<"chatConversations">,
      }).finally(() => setIsRatingConversation(false));
    }
  }, [conversationId, isRatingConversation, likeConversation]);

  const handleDislike = useCallback(() => {
    if (conversationId && !isRatingConversation) {
      setIsRatingConversation(true);
      void dislikeConversation({
        conversationId: conversationId as Id<"chatConversations">,
      }).finally(() => setIsRatingConversation(false));
    }
  }, [conversationId, dislikeConversation, isRatingConversation]);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `${CONVEX_SITE_URL}/chat`,
      credentials: "include",
      async headers() {
        // Get the Convex JWT token from the Better Auth convex plugin
        const tokenResult = await authClient.convex.token({
          fetchOptions: { throw: false },
        });
        const token = tokenResult.data?.token;
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
      },
      async prepareSendMessagesRequest({ messages }) {
        const requestConversationId =
          conversationIdRef.current ??
          (await ensureConversationForFirstMessage(
            getFirstUserMessageText(messages),
          ));

        return {
          body: {
            messages,
            enableThinking: true,
            conversationId: requestConversationId,
          },
        };
      },
    }),
    onFinish: () => {
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    onError: (err) => {
      console.error("[Chat] Error:", err);
    },
  });

  // Load conversation from URL once the Convex client is authenticated —
  // querying before the JWT exchange completes throws UNAUTHORIZED and
  // would wipe the search params below.
  useEffect(() => {
    if (!isAuthenticated) return;
    const urlConversationId = searchParams.get("c");
    if (urlConversationId && isLoadingConversation) {
      convex
        .query(api.chat.queries.getConversation, {
          conversationId: urlConversationId as Id<"chatConversations">,
        })
        .then((data) => {
          if (!data) {
            toast.error("Conversation not found");
            setSearchParams({}, { replace: true });
            return;
          }
          setConversationId(data._id as string);
          setMessages(data.messages as UIMessage[]);
          conversationIdRef.current = data._id as string;
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
  }, [isAuthenticated]);

  const isGenerating = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isGenerating) return;

    const messageText = input.trim();
    setInput("");

    // Send message immediately for instant optimistic update
    void sendMessage({ text: messageText }).catch((error) => {
      console.error("Send failed:", error);
      toast.error("Failed to send message");
    });
  }, [
    input,
    isGenerating,
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

      // Send message immediately for instant optimistic update
      void sendMessage({ text: s }).catch((error) => {
        console.error("Send failed:", error);
        toast.error("Failed to send message");
      });
    },
    [sendMessage],
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
    conversationVersionRef.current += 1;
    conversationCreationPromiseRef.current = null;
    setConversationId(null);
    setMessages([]);
    setInput("");
    conversationIdRef.current = null;
    setSearchParams({}, { replace: true });
  }, [setMessages, setSearchParams]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      try {
        const data = await convex.query(api.chat.queries.getConversation, {
          conversationId: id as Id<"chatConversations">,
        });
        if (!data) {
          toast.error("Conversation not found");
          return;
        }
        conversationVersionRef.current += 1;
        conversationCreationPromiseRef.current = null;
        setConversationId(data._id as string);
        setMessages(data.messages as UIMessage[]);
        conversationIdRef.current = data._id as string;
      } catch {
        toast.error("Failed to load conversation");
      }
    },
    [convex, setMessages],
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
    <div className="bg-muted fixed inset-0 flex flex-col overflow-hidden">
      <ChatHeader
        conversationId={conversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
      />

      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center">
          <div className="flex min-h-0 w-full max-w-3xl flex-1 flex-col">
            <EmptyState onSuggestionClick={handleSuggestionClick} />
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
      ) : (
        <StickToBottom
          className="relative min-h-0 flex-1"
          initial="smooth"
          resize="smooth"
        >
          <StickToBottom.Content className="flex flex-col items-center pb-28">
            <div className="flex w-full max-w-3xl flex-col gap-3 p-4">
              {messages.map((m, i) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  isLast={i === messages.length - 1}
                  isLoading={isGenerating}
                  onEdit={handleEditMessage}
                  onLike={m.role === "assistant" ? handleLike : undefined}
                  onDislike={m.role === "assistant" ? handleDislike : undefined}
                />
              ))}
            </div>
          </StickToBottom.Content>
          <ScrollButton />
          <div className="bg-muted/80 sticky bottom-0 w-full backdrop-blur-sm">
            <div className="mx-auto max-w-3xl p-3">
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
        </StickToBottom>
      )}

      {bookmarkId && (
        <BookmarkDialog bookmarkId={bookmarkId} onClose={handleCloseBookmark} />
      )}
    </div>
  );
}

export { ChatPage as AgentsPage };
