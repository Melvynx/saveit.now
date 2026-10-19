"use client";

import { authClient } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useChat } from "@ai-sdk/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useConvex, useConvexAuth, useMutation } from "convex/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowDownIcon } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Sheet, SheetContent, SheetTitle } from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { getConvexSiteUrl } from "@/lib/convex-url";
import { ChatComposer, type ChatComposerHandle } from "./components/chat-composer";
import { ChatEmptyState } from "./components/chat-empty-state";
import { ChatHeader } from "./components/chat-header";
import { ConversationHistory } from "./components/conversation-history";
import { MessageItem } from "./components/message-item";
import {
  type ConversationListItem,
  getFirstUserMessageText,
} from "./chat-utils";
import { useHistoryPanel } from "./use-history-panel";

const CONVEX_SITE_URL = getConvexSiteUrl();
const BookmarkDialog = lazy(() =>
  import("../bookmark-page/bookmark-page").then((module) => ({
    default: module.BookmarkDialog,
  })),
);

type SearchUpdater = (previous: URLSearchParams) => URLSearchParams;

function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;

  return (
    <Button
      size="icon-sm"
      variant="outline"
      aria-label="Scroll to latest message"
      className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background shadow-sm"
      onClick={() => void scrollToBottom()}
    >
      <ArrowDownIcon />
    </Button>
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
      if (typeof value === "string") params.set(key, value);
    });
    return params;
  }, [routeSearch]);

  // Always derive from the router's live search state, never from a closure
  // snapshot: a stale snapshot taken during hydration can drop `b` or `c`.
  const updateSearchParams = useCallback(
    (update: SearchUpdater) => {
      void navigate({
        to: "/app/agents" as never,
        search: ((current: Record<string, unknown>) => {
          const params = new URLSearchParams();
          Object.entries(current ?? {}).forEach(([key, value]) => {
            if (typeof value === "string") params.set(key, value);
          });
          return Object.fromEntries(update(params).entries());
        }) as never,
        replace: true,
      });
    },
    [navigate],
  );
  const deleteSearchParams = useCallback(
    (...keys: string[]) =>
      updateSearchParams((params) => {
        keys.forEach((key) => params.delete(key));
        return params;
      }),
    [updateSearchParams],
  );

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
  const composerRef = useRef<ChatComposerHandle>(null);
  const conversationIdRef = useRef(conversationId);
  const conversationCreationPromiseRef = useRef<Promise<string> | null>(null);
  const conversationVersionRef = useRef(0);
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const [isRatingConversation, setIsRatingConversation] = useState(false);
  const history = useHistoryPanel();
  const [autoFocusComposer] = useState(
    () => window.matchMedia("(pointer: fine)").matches,
  );

  const bookmarkId = searchParams.get("b");

  const handleCloseBookmark = useCallback(() => {
    deleteSearchParams("b");
  }, [deleteSearchParams]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    updateSearchParams((params) => {
      if (conversationId) params.set("c", conversationId);
      else params.delete("c");
      return params;
    });
  }, [conversationId, updateSearchParams]);

  const usage = useAuthedQuery(api.chat.queries.getChatUsage, {});
  const conversations = useAuthedQuery(
    api.chat.queries.listConversations,
    {},
  ) as ConversationListItem[] | undefined;

  const createConversation = useMutation(api.chat.mutations.createConversation);
  const deleteConversation = useMutation(api.chat.mutations.deleteConversation);
  const likeConversation = useMutation(api.chat.mutations.likeConversation);
  const dislikeConversation = useMutation(
    api.chat.mutations.dislikeConversation,
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
              setConversationTitle(data.title ?? null);
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
      setTimeout(() => composerRef.current?.focus(), 0);
    },
    onError: (err) => {
      console.error("[Chat] Error:", err);
      toast.error(
        err.message.includes("limit")
          ? "You've reached this month's question limit"
          : "The answer couldn't be generated. Try again.",
      );
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
            setConversationId(null);
            deleteSearchParams("c");
            return;
          }
          setConversationId(data._id as string);
          setConversationTitle(data.title ?? null);
          setMessages(data.messages as UIMessage[]);
          conversationIdRef.current = data._id as string;
        })
        .catch(() => {
          toast.error("Failed to load conversation");
          setConversationId(null);
          deleteSearchParams("c");
        })
        .finally(() => {
          setIsLoadingConversation(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const isGenerating = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string) => {
      void sendMessage({ text }).catch((error) => {
        console.error("Send failed:", error);
        toast.error("Failed to send message");
      });
    },
    [sendMessage],
  );

  const handleSubmit = useCallback(() => {
    const messageText = input.trim();
    if (!messageText || isGenerating) return;
    setInput("");
    send(messageText);
  }, [input, isGenerating, send]);

  const handleSuggestion = useCallback(
    (prompt: string) => {
      composerRef.current?.focus();
      send(prompt);
    },
    [send],
  );

  // ?q= auto-submits once, then only `q` is stripped so `c` / `b` survive.
  const hasAutoSubmittedRef = useRef(false);
  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam && !hasAutoSubmittedRef.current && !isLoadingConversation) {
      hasAutoSubmittedRef.current = true;
      send(queryParam);
      deleteSearchParams("q");
    }
  }, [searchParams, isLoadingConversation, send, deleteSearchParams]);

  const resetConversation = useCallback(() => {
    conversationVersionRef.current += 1;
    conversationCreationPromiseRef.current = null;
    conversationIdRef.current = null;
    setConversationId(null);
    setConversationTitle(null);
    setMessages([]);
  }, [setMessages]);

  const handleNewConversation = useCallback(() => {
    if (isGenerating) void stop();
    resetConversation();
    setInput("");
    deleteSearchParams("c", "q");
    setTimeout(() => composerRef.current?.focus(), 0);
  }, [deleteSearchParams, isGenerating, resetConversation, stop]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      history.closeSheet();
      if (id === conversationIdRef.current) return;
      try {
        const data = await convex.query(api.chat.queries.getConversation, {
          conversationId: id as Id<"chatConversations">,
        });
        if (!data) {
          toast.error("Conversation not found");
          return;
        }
        if (isGenerating) void stop();
        conversationVersionRef.current += 1;
        conversationCreationPromiseRef.current = null;
        conversationIdRef.current = data._id as string;
        setConversationId(data._id as string);
        setConversationTitle(data.title ?? null);
        setMessages(data.messages as UIMessage[]);
      } catch {
        toast.error("Failed to load conversation");
      }
    },
    [convex, history, isGenerating, setMessages, stop],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation({
          conversationId: id as Id<"chatConversations">,
        });
        if (id === conversationIdRef.current) {
          resetConversation();
          deleteSearchParams("c");
        }
        toast.success("Conversation deleted");
      } catch {
        toast.error("Failed to delete conversation");
        throw new Error("delete failed");
      }
    },
    [deleteConversation, deleteSearchParams, resetConversation],
  );

  const handleEditMessage = useCallback(
    (messageId: string, newContent: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      const originalMessage = messages[messageIndex];
      if (messageIndex === -1 || !originalMessage) return;

      const updatedMessages = messages.slice(0, messageIndex);
      updatedMessages.push({
        ...originalMessage,
        parts: [{ type: "text", text: newContent }],
      });

      setMessages(updatedMessages);
      send(newContent);
    },
    [messages, setMessages, send],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        handleNewConversation();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewConversation]);

  const listTitle = conversations?.find(
    (conversation) => conversation._id === conversationId,
  )?.title;
  const title =
    conversationId || messages.length
      ? (listTitle ?? conversationTitle ?? "New conversation")
      : "Ask AI";

  const composer = (
    <ChatComposer
      ref={composerRef}
      value={input}
      onChange={setInput}
      onSubmit={handleSubmit}
      onStop={() => void stop()}
      isGenerating={isGenerating}
      usage={usage ?? null}
      autoFocus={autoFocusComposer}
    />
  );

  const historyPanel = (
    <ConversationHistory
      conversations={conversations}
      currentConversationId={conversationId}
      onSelect={(id) => void handleSelectConversation(id)}
      onDelete={handleDeleteConversation}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] min-h-0 flex-col md:h-dvh">
      <ChatHeader
        title={title}
        historyOpen={history.isOpen}
        canStartNew={!!conversationId || messages.length > 0 || !!input}
        onNewConversation={handleNewConversation}
        onToggleHistory={history.toggle}
      />

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col">
          {isLoadingConversation ? (
            <ConversationSkeleton />
          ) : messages.length === 0 ? (
            <ChatEmptyState
              onSuggestion={handleSuggestion}
              composer={composer}
            />
          ) : (
            <>
              <StickToBottom
                className="relative min-h-0 flex-1"
                initial="instant"
                resize="smooth"
              >
                <StickToBottom.Content
                  scrollClassName="overscroll-contain"
                  className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-4 pt-6 pb-10 md:px-6"
                >
                  {messages.map((message, index) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      isLast={index === messages.length - 1}
                      isLoading={isGenerating}
                      onEdit={isGenerating ? undefined : handleEditMessage}
                      onLike={
                        message.role === "assistant" && conversationId
                          ? handleLike
                          : undefined
                      }
                      onDislike={
                        message.role === "assistant" && conversationId
                          ? handleDislike
                          : undefined
                      }
                    />
                  ))}
                </StickToBottom.Content>
                <ScrollToBottomButton />
              </StickToBottom>
              <div className="shrink-0 bg-gradient-to-t from-background from-70% to-transparent">
                <div className="mx-auto w-full max-w-[720px] px-4 pt-1 md:px-6">
                  {composer}
                </div>
              </div>
            </>
          )}
        </div>

        <aside
          aria-label="Conversation history"
          className={cn(
            "hidden w-[280px] shrink-0 flex-col border-l border-border bg-sidebar/60",
            history.isPanelVisible && "xl:flex",
          )}
        >
          {historyPanel}
        </aside>
      </div>

      <Sheet open={history.isSheetOpen} onOpenChange={history.setSheetOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[320px] max-w-[88vw] gap-0 p-0 data-[side=right]:w-[320px] xl:hidden"
        >
          <SheetTitle className="sr-only">Conversation history</SheetTitle>
          <ConversationHistory
            conversations={conversations}
            currentConversationId={conversationId}
            onSelect={(id) => void handleSelectConversation(id)}
            onDelete={handleDeleteConversation}
            onClose={history.closeSheet}
          />
        </SheetContent>
      </Sheet>

      {bookmarkId && (
        <Suspense fallback={null}>
          <BookmarkDialog bookmarkId={bookmarkId} onClose={handleCloseBookmark} />
        </Suspense>
      )}
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading conversation"
      className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 pt-6 md:px-6"
    >
      <div className="ml-auto h-10 w-2/5 animate-pulse rounded-2xl bg-muted" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export { ChatPage as AgentsPage };
