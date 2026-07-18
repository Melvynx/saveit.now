import { api } from "@convex/_generated/api";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { useMutation } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Linking, Share } from "react-native";

import { hapticSuccess, hapticWarning } from "../lib/haptics";

export function useBookmarkDetailActions(
  bookmark: BookmarkDetailDTO | null | undefined,
) {
  const router = useRouter();
  const updateBookmark = useMutation(api.bookmarks.mutations.update);
  const deleteBookmark = useMutation(api.bookmarks.mutations.remove);
  const recordOpen = useMutation(api.bookmarks.mutations.recordOpen);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyResetTimeout.current) clearTimeout(copyResetTimeout.current);
    },
    [],
  );

  const openActions = useCallback(() => setActionsOpen(true), []);
  const closeActions = useCallback(() => setActionsOpen(false), []);

  const toggleStar = useCallback(async () => {
    if (!bookmark) return;

    try {
      await updateBookmark({
        id: bookmark._id,
        patch: { starred: !bookmark.starred },
      });
    } catch {
      Alert.alert("Error", "Failed to update bookmark");
    }
  }, [bookmark, updateBookmark]);

  const toggleRead = useCallback(async () => {
    if (!bookmark) return;

    try {
      await updateBookmark({
        id: bookmark._id,
        patch: { read: !bookmark.read },
      });
    } catch {
      Alert.alert("Error", "Failed to update bookmark");
    }
  }, [bookmark, updateBookmark]);

  const copyLink = useCallback(async () => {
    if (!bookmark) return;

    setCopying(true);
    try {
      await Clipboard.setStringAsync(bookmark.url);
      setCopied(true);
      hapticSuccess();
      AccessibilityInfo.announceForAccessibility("Link copied");
      if (copyResetTimeout.current) clearTimeout(copyResetTimeout.current);
      copyResetTimeout.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      Alert.alert("Couldn’t copy link", "Please try again.");
    } finally {
      setCopying(false);
    }
  }, [bookmark]);

  const openLink = useCallback(async () => {
    if (!bookmark) return;

    try {
      const supported = await Linking.canOpenURL(bookmark.url);
      if (!supported) {
        Alert.alert("Error", "Cannot open this URL");
        return;
      }

      await Linking.openURL(bookmark.url);
      void recordOpen({ id: bookmark._id }).catch(() => {});
    } catch {
      Alert.alert("Error", "Failed to open link");
    }
  }, [bookmark, recordOpen]);

  const shareBookmark = useCallback(async () => {
    if (!bookmark) return;

    try {
      await Share.share({
        title: bookmark.title ?? "SaveIt bookmark",
        message: bookmark.url,
      });
    } catch {
      Alert.alert("Couldn’t share bookmark", "Please try again.");
    }
  }, [bookmark]);

  const saveNote = useCallback(
    async (note: string | null) => {
      if (!bookmark) return;

      await updateBookmark({
        id: bookmark._id,
        patch: { note },
      });
      hapticSuccess();
      AccessibilityInfo.announceForAccessibility("Note saved");
    },
    [bookmark, updateBookmark],
  );

  const deleteBookmarkWithConfirmation = useCallback(() => {
    if (!bookmark) return;

    hapticWarning();
    Alert.alert(
      "Delete Bookmark",
      "Are you sure you want to delete this bookmark? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBookmark({ id: bookmark._id });
              router.back();
            } catch {
              Alert.alert("Error", "Failed to delete bookmark");
            }
          },
        },
      ],
    );
  }, [bookmark, deleteBookmark, router]);

  return {
    actionsOpen,
    copied,
    copying,
    closeActions,
    copyLink,
    deleteBookmarkWithConfirmation,
    openActions,
    openLink,
    saveNote,
    shareBookmark,
    toggleRead,
    toggleStar,
  };
}
