import { Ionicons } from "@expo/vector-icons";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { Alert, FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hapticSelection } from "../../lib/haptics";
import { useThemeColors } from "../../lib/theme";
import { LoadingSpinner } from "../ui/loading";
import { Text } from "../ui/text";

type Conversation = {
  _id: Id<"chatConversations">;
  title: string | null;
  updatedAt: number;
  createdAt: number;
};

type ChatHistoryModalProps = {
  visible: boolean;
  selectedConversationId: string | null;
  onClose: () => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
};

function formatConversationDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  return new Intl.DateTimeFormat(undefined, {
    ...(isToday
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" }),
  }).format(date);
}

export function ChatHistoryModal({
  visible,
  selectedConversationId,
  onClose,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ChatHistoryModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const conversations = useQuery(
    api.chat.queries.listConversations,
    visible ? {} : "skip",
  ) as Conversation[] | undefined;
  const deleteConversation = useMutation(api.chat.mutations.deleteConversation);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const confirmDelete = useCallback(
    (conversation: Conversation) => {
      hapticSelection();
      Alert.alert(
        "Delete conversation?",
        `“${conversation.title ?? "New conversation"}” will be permanently deleted.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              setDeletingId(conversation._id);
              void deleteConversation({ conversationId: conversation._id })
                .then(() => onDeleteConversation(conversation._id))
                .catch(() =>
                  Alert.alert("Couldn’t delete chat", "Please try again."),
                )
                .finally(() => setDeletingId(null));
            },
          },
        ],
      );
    },
    [deleteConversation, onDeleteConversation],
  );

  return (
    <Modal
      presentationStyle="pageSheet"
      allowSwipeDismissal
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        <View className="flex-row items-center gap-3 border-b border-border px-4 pb-3 pt-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close chat history"
            hitSlop={8}
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-secondary active:opacity-70"
          >
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
          <Text className="flex-1 font-sans-bold text-[22px] text-foreground">
            Chat history
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new conversation"
            onPress={() => {
              hapticSelection();
              onNewConversation();
            }}
            className="h-10 flex-row items-center gap-1.5 rounded-full bg-primary px-3.5 active:opacity-80"
          >
            <Ionicons name="add" size={18} color={colors.primaryForeground} />
            <Text className="font-sans-semibold text-[13px] text-primary-foreground">
              New
            </Text>
          </Pressable>
        </View>

        {conversations === undefined ? (
          <View className="flex-1 items-center justify-center">
            <LoadingSpinner />
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(conversation) => conversation._id}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
              padding: 16,
              paddingBottom: Math.max(insets.bottom, 12) + 16,
              flexGrow: conversations.length === 0 ? 1 : undefined,
            }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => {
              const isSelected = selectedConversationId === item._id;
              const isDeleting = deletingId === item._id;
              const isDeleteInProgress = deletingId !== null;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open conversation: ${item.title ?? "New conversation"}`}
                  accessibilityState={{
                    selected: isSelected,
                    disabled: isDeleteInProgress,
                  }}
                  disabled={isDeleteInProgress}
                  onPress={() => {
                    hapticSelection();
                    onSelectConversation(item._id);
                  }}
                  className={[
                    "flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:opacity-80",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card",
                  ].join(" ")}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={isSelected ? colors.primary : colors.foreground}
                    />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text
                      numberOfLines={1}
                      className="font-sans-semibold text-[15px] text-foreground"
                    >
                      {item.title ?? "New conversation"}
                    </Text>
                    <Text variant="caption">
                      {formatConversationDate(item.updatedAt)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.title ?? "conversation"}`}
                    hitSlop={8}
                    disabled={isDeleteInProgress}
                    onPress={(event) => {
                      event.stopPropagation();
                      confirmDelete(item);
                    }}
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-secondary"
                  >
                    {isDeleting ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={colors.mutedForeground}
                      />
                    )}
                  </Pressable>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center gap-3 px-8">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                  <Ionicons
                    name="chatbubbles-outline"
                    size={26}
                    color={colors.mutedForeground}
                  />
                </View>
                <Text className="font-sans-bold text-[19px] text-foreground">
                  No conversations yet
                </Text>
                <Text variant="subtitle" className="text-center">
                  Your saved conversations will appear here.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
