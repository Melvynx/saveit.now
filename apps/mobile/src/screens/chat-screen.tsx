import { Ionicons } from "@expo/vector-icons";
import { useChat } from "@ai-sdk/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useConvex, useMutation, useQuery } from "convex/react";
import { fetch as expoFetch } from "expo/fetch";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatHistoryModal } from "../components/chat/chat-history-modal";
import { ChatMessage } from "../components/chat/chat-message";
import { LoadingSpinner } from "../components/ui/loading";
import { Text } from "../components/ui/text";
import { authClient } from "../lib/auth-client";
import { mobileConfig } from "../lib/config";
import { hapticLight, hapticSelection } from "../lib/haptics";
import { useThemeColors } from "../lib/theme";

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

function getChatErrorMessage(error: Error | undefined) {
  if (!error) return null;
  if (
    error.message.includes("429") ||
    error.message.includes("limit reached")
  ) {
    return "You’ve reached your monthly chat limit.";
  }
  if (error.message.includes("401") || error.message.includes("Unauthorized")) {
    return "Your session expired. Sign in again to continue.";
  }
  return "The chat couldn’t respond. Check your connection and try again.";
}

function useKeyboardBottomInset() {
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(
    () => Keyboard.metrics()?.height ?? 0,
  );

  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardBottomInset(event.endCoordinates.height);
    };
    const handleKeyboardHide = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardBottomInset(0);
    };

    const subscriptions =
      Platform.OS === "ios"
        ? [
            Keyboard.addListener("keyboardWillShow", handleKeyboardShow),
            Keyboard.addListener("keyboardDidShow", handleKeyboardShow),
            Keyboard.addListener("keyboardWillHide", handleKeyboardHide),
            Keyboard.addListener("keyboardDidHide", handleKeyboardHide),
          ]
        : [
            Keyboard.addListener("keyboardDidShow", handleKeyboardShow),
            Keyboard.addListener("keyboardDidHide", handleKeyboardHide),
          ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  return keyboardBottomInset;
}

export default function ChatScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const convex = useConvex();
  const listRef = useRef<FlatList<UIMessage>>(null);
  const conversationIdRef = useRef<string | null>(null);
  const conversationCreationPromiseRef = useRef<Promise<string> | null>(null);
  const conversationVersionRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [chatInstanceId, setChatInstanceId] = useState("mobile-chat-0");
  const [seedMessages, setSeedMessages] = useState<UIMessage[]>([]);
  const [conversationLoadError, setConversationLoadError] = useState<
    string | null
  >(null);
  const keyboardBottomInset = useKeyboardBottomInset();

  const usage = useQuery(api.chat.queries.getChatUsage);
  const createConversation = useMutation(api.chat.mutations.createConversation);

  const ensureConversationForFirstMessage = useCallback(
    async (firstMessage: string) => {
      if (conversationIdRef.current) return conversationIdRef.current;

      if (!conversationCreationPromiseRef.current) {
        const version = conversationVersionRef.current;
        conversationCreationPromiseRef.current = createConversation({
          firstMessage,
        })
          .then((result) => {
            const nextId = result.id as string;
            if (
              conversationVersionRef.current === version &&
              !conversationIdRef.current
            ) {
              conversationIdRef.current = nextId;
              setConversationId(nextId);
            }
            return nextId;
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

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${mobileConfig.convexSiteUrl}/chat`,
        credentials: "include",
        fetch: expoFetch as unknown as typeof globalThis.fetch,
        async headers() {
          const tokenResult = await authClient.convex.token({
            fetchOptions: { throw: false },
          });
          const token = tokenResult.data?.token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
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
    [ensureConversationForFirstMessage],
  );

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    id: chatInstanceId,
    messages: seedMessages,
    transport,
    onFinish: () => {
      if (shouldAutoScrollRef.current) {
        requestAnimationFrame(() =>
          listRef.current?.scrollToEnd({ animated: true }),
        );
      }
    },
  });

  const isGenerating = status === "submitted" || status === "streaming";
  const hasReachedLimit = usage?.remaining === 0;
  const errorMessage = conversationLoadError ?? getChatErrorMessage(error);
  const canSubmit =
    Boolean(input.trim()) &&
    !isGenerating &&
    !isLoadingConversation &&
    !hasReachedLimit;
  const composerBottomInset =
    keyboardBottomInset > 0 ? keyboardBottomInset + 8 : insets.bottom + 56;

  const clearAllErrors = useCallback(() => {
    setConversationLoadError(null);
    clearError();
  }, [clearError]);

  const scrollToBottom = useCallback((animated: boolean) => {
    if (shouldAutoScrollRef.current) {
      listRef.current?.scrollToEnd({ animated });
    }
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      shouldAutoScrollRef.current = distanceFromBottom < 120;
    },
    [],
  );

  const handleSubmit = useCallback(
    (text = input) => {
      const messageText = text.trim();
      if (
        !messageText ||
        isGenerating ||
        isLoadingConversation ||
        hasReachedLimit
      ) {
        return;
      }

      hapticLight();
      clearAllErrors();
      setInput("");
      shouldAutoScrollRef.current = true;
      void sendMessage({ text: messageText }).catch(() => undefined);
    },
    [
      clearAllErrors,
      hasReachedLimit,
      input,
      isGenerating,
      isLoadingConversation,
      sendMessage,
    ],
  );

  const handleNewConversation = useCallback(() => {
    if (isGenerating) void stop();
    const nextVersion = conversationVersionRef.current + 1;
    conversationVersionRef.current = nextVersion;
    conversationCreationPromiseRef.current = null;
    conversationIdRef.current = null;
    setConversationId(null);
    setSeedMessages([]);
    setChatInstanceId(`mobile-chat-${nextVersion}`);
    setInput("");
    clearAllErrors();
    setIsLoadingConversation(false);
    setHistoryVisible(false);
    shouldAutoScrollRef.current = true;
  }, [clearAllErrors, isGenerating, stop]);

  const handleSelectConversation = useCallback(
    async (nextConversationId: string) => {
      if (isGenerating) await stop();
      const operationVersion = conversationVersionRef.current + 1;
      conversationVersionRef.current = operationVersion;
      conversationCreationPromiseRef.current = null;
      setHistoryVisible(false);
      setIsLoadingConversation(true);
      clearAllErrors();

      try {
        const conversation = await convex.query(
          api.chat.queries.getConversation,
          {
            conversationId: nextConversationId as Id<"chatConversations">,
          },
        );

        if (!conversation) throw new Error("Conversation not found");
        if (conversationVersionRef.current !== operationVersion) return;

        conversationIdRef.current = conversation._id;
        setConversationId(conversation._id);
        setSeedMessages(conversation.messages as UIMessage[]);
        setChatInstanceId(`mobile-chat-${operationVersion}`);
        shouldAutoScrollRef.current = true;
        requestAnimationFrame(() =>
          listRef.current?.scrollToEnd({ animated: false }),
        );
      } catch (loadError) {
        if (conversationVersionRef.current !== operationVersion) return;
        console.error("[MobileChat] Failed to load conversation", loadError);
        setConversationLoadError(
          "That conversation couldn’t be loaded. Please try again.",
        );
      } finally {
        if (conversationVersionRef.current === operationVersion) {
          setIsLoadingConversation(false);
        }
      }
    },
    [clearAllErrors, convex, isGenerating, stop],
  );

  const handleDeleteConversation = useCallback(
    (deletedConversationId: string) => {
      if (deletedConversationId === conversationIdRef.current) {
        handleNewConversation();
      }
    },
    [handleNewConversation],
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: UIMessage; index: number }) => (
      <ChatMessage
        message={item}
        isLast={index === messages.length - 1}
        isStreaming={isGenerating}
        onBookmarkPress={(bookmarkId) => router.push(`/bookmark/${bookmarkId}`)}
      />
    ),
    [isGenerating, messages.length, router],
  );

  const emptyState = (
    <View className="flex-1 items-center gap-4 px-5 pb-3 pt-4">
      {usage ? (
        <Text
          variant="caption"
          className={[
            "self-start",
            usage.remaining <= 3 ? "text-destructive" : "",
          ].join(" ")}
        >
          {usage.used}/{usage.limit} questions this month
        </Text>
      ) : null}
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary">
        <Ionicons name="sparkles" size={22} color={colors.primaryForeground} />
      </View>
      <View className="items-center gap-1">
        <Text className="font-sans-bold text-[22px] text-foreground">
          SaveIt Chat
        </Text>
        <Text
          variant="subtitle"
          className="max-w-[300px] text-center text-[13px] leading-[18px]"
        >
          Ask questions, find anything you saved, and explore your bookmarks.
        </Text>
      </View>
      <View className="w-full max-w-[360px] gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Pressable
            key={suggestion}
            accessibilityRole="button"
            accessibilityLabel={suggestion}
            disabled={hasReachedLimit || isLoadingConversation}
            onPress={() => handleSubmit(suggestion)}
            className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 active:opacity-80 disabled:opacity-50"
          >
            <View className="h-7 w-7 items-center justify-center rounded-lg bg-secondary">
              <Ionicons name="arrow-up" size={15} color={colors.primary} />
            </View>
            <Text className="flex-1 font-sans-medium text-[14px] text-foreground">
              {suggestion}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Chat",
          headerLargeTitle: false,
          headerBackVisible: false,
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleAlign: "left",
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            color: colors.foreground,
            fontSize: 22,
            fontWeight: "700",
          },
          contentStyle: { backgroundColor: colors.background },
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open chat history"
                hitSlop={8}
                disabled={isLoadingConversation}
                onPress={() => {
                  hapticSelection();
                  setHistoryVisible(true);
                }}
                className="h-10 w-10 items-center justify-center active:opacity-60 disabled:opacity-40"
              >
                <Ionicons
                  name="time-outline"
                  size={23}
                  color={colors.primary}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start a new conversation"
                hitSlop={8}
                disabled={
                  isLoadingConversation ||
                  (messages.length === 0 && !conversationId)
                }
                onPress={() => {
                  hapticSelection();
                  handleNewConversation();
                }}
                className="h-10 w-10 items-center justify-center active:opacity-60 disabled:opacity-40"
              >
                <Ionicons
                  name="create-outline"
                  size={23}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          ),
        }}
      />

      <View className="flex-1 bg-background">
        {isLoadingConversation ? (
          <View className="flex-1 items-center justify-center">
            <LoadingSpinner />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(message) => message.id}
            renderItem={renderMessage}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: messages.length > 0 ? 18 : 0,
              gap: 18,
              flexGrow: messages.length === 0 ? 1 : undefined,
            }}
            scrollEnabled={messages.length > 0}
            alwaysBounceVertical={messages.length > 0}
            ListHeaderComponent={
              messages.length > 0 && usage ? (
                <View className="items-start pb-1">
                  <Text
                    variant="caption"
                    className={
                      usage.remaining <= 3 ? "text-destructive" : undefined
                    }
                  >
                    {usage.used}/{usage.limit} questions this month
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={emptyState}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onScroll={handleScroll}
            onContentSizeChange={() => scrollToBottom(false)}
            scrollEventThrottle={16}
          />
        )}

        <View
          className="border-t border-border bg-background px-3 pt-2"
          style={{ paddingBottom: composerBottomInset }}
        >
          {errorMessage ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss chat error"
              onPress={clearAllErrors}
              className="mb-2 flex-row items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 active:opacity-80"
            >
              <Ionicons
                name="alert-circle-outline"
                size={17}
                color={colors.destructive}
              />
              <Text className="flex-1 font-sans-medium text-[13px] text-destructive">
                {errorMessage}
              </Text>
              <Ionicons name="close" size={15} color={colors.destructive} />
            </Pressable>
          ) : null}

          {hasReachedLimit ? (
            <Text className="mb-2 text-center font-sans-medium text-[12px] text-destructive">
              Monthly chat limit reached
            </Text>
          ) : null}

          <View className="flex-row items-end gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new conversation"
              accessibilityState={{
                disabled:
                  isLoadingConversation ||
                  (messages.length === 0 && !conversationId),
              }}
              disabled={
                isLoadingConversation ||
                (messages.length === 0 && !conversationId)
              }
              onPress={() => {
                hapticSelection();
                handleNewConversation();
              }}
              className="h-12 w-9 items-center justify-center active:opacity-60 disabled:opacity-40"
            >
              <Ionicons name="add" size={28} color={colors.mutedForeground} />
            </Pressable>

            <View className="min-h-12 flex-1 flex-row items-end gap-2 rounded-full border border-border bg-card py-1.5 pl-4 pr-1.5">
              <TextInput
                accessibilityLabel="Ask about your bookmarks"
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your bookmarks…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                editable={!hasReachedLimit && !isLoadingConversation}
                maxLength={4000}
                className="max-h-28 min-h-[36px] flex-1 py-1.5 font-sans text-[15px] leading-5 text-foreground"
                selectionColor={colors.primary}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isGenerating ? "Stop response" : "Send message"
                }
                accessibilityState={{ disabled: !isGenerating && !canSubmit }}
                disabled={!isGenerating && !canSubmit}
                onPress={() => {
                  if (isGenerating) {
                    hapticSelection();
                    void stop();
                  } else {
                    handleSubmit();
                  }
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-primary active:opacity-80 disabled:opacity-40"
              >
                {status === "submitted" ? (
                  <LoadingSpinner
                    size="small"
                    color={colors.primaryForeground}
                  />
                ) : (
                  <Ionicons
                    name={isGenerating ? "stop" : "arrow-up"}
                    size={17}
                    color={colors.primaryForeground}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <ChatHistoryModal
          visible={historyVisible}
          selectedConversationId={conversationId}
          onClose={() => setHistoryVisible(false)}
          onNewConversation={handleNewConversation}
          onSelectConversation={(nextId) =>
            void handleSelectConversation(nextId)
          }
          onDeleteConversation={handleDeleteConversation}
        />
      </View>
    </>
  );
}
