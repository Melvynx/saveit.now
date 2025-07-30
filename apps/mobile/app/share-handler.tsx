import { AlertTriangle, Bookmark, Check, X } from "@tamagui/lucide-icons";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import React, { useEffect } from "react";
import {
  Button,
  Circle,
  H2,
  Paragraph,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from "tamagui";
import { apiClient } from "../src/lib/api-client";

export default function ShareHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntentContext();
  const router = useRouter();
  const params = useLocalSearchParams();
  const createBookmarkMutation = useMutation({
    mutationFn: ({
      url,
      metadata,
    }: {
      url: string;
      metadata: Record<string, any>;
    }) => apiClient.createBookmark({ url, metadata }),
    onSuccess: () => {
      // Show success for 2 seconds, then close
      setTimeout(() => {
        resetShareIntent();
        router.dismiss();
      }, 2000);
    },
    onError: () => {
      // Show error UI for 3 seconds, then close
      setTimeout(() => {
        resetShareIntent();
        router.dismiss();
      }, 3000);
    },
  });

  useEffect(() => {
    // If no share intent, immediately redirect to tabs
    if (!hasShareIntent && !shareIntent) {
      resetShareIntent();
      router.replace("/(tabs)");
      return;
    }

    if (
      hasShareIntent &&
      shareIntent &&
      !createBookmarkMutation.isPending &&
      !createBookmarkMutation.isSuccess &&
      !createBookmarkMutation.isError
    ) {
      handleSharedContent();
    }
  }, [hasShareIntent, shareIntent]);

  const handleSharedContent = () => {
    if (!shareIntent) {
      return;
    }

    let url = "";
    let metadata: Record<string, any> = {};

    // Handle different types of shared content
    if (shareIntent.webUrl) {
      // Direct URL sharing
      url = shareIntent.webUrl;
      metadata.title = shareIntent.text || "";
    } else if (shareIntent.text) {
      // Text content - check if it's a URL
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = shareIntent.text.match(urlRegex);

      if (urlMatch && urlMatch.length > 0) {
        // Text contains URL
        url = urlMatch[0];
        metadata.title = shareIntent.text.replace(url, "").trim();
      } else {
        // Pure text - save as note
        url = shareIntent.text;
        metadata.isTextNote = true;
      }
    } else if (shareIntent.files && shareIntent.files.length > 0) {
      // File content (images, etc.)
      const file = shareIntent.files[0];
      if (file) {
        url = file.path;
        metadata = {
          type: "file",
          fileName: file.fileName || "Shared file",
          mimeType: file.mimeType,
          fileSize: file.size,
        };
      }
    }

    if (!url) {
      return;
    }

    createBookmarkMutation.mutate({ url, metadata });
  };

  const handleCancel = () => {
    resetShareIntent();
    router.dismiss();
  };

  // Error state
  if (error) {
    return (
      <View flex={1} backgroundColor="$background">
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$4">
          <Circle
            size={80}
            backgroundColor="$destructive"
            alignItems="center"
            justifyContent="center"
          >
            <AlertTriangle size={40} color="$destructiveForeground" />
          </Circle>

          <YStack gap="$2" alignItems="center">
            <H2 color="$destructive" textAlign="center">
              Share Error
            </H2>
            <Paragraph color="$foreground" textAlign="center" opacity={0.8}>
              {typeof error === "string"
                ? error
                : (error as any)?.message || "Unable to process shared content"}
            </Paragraph>
          </YStack>

          <Button
            size="$4"
            onPress={handleCancel}
            backgroundColor="$destructive"
            borderRadius="$4"
            fontWeight="600"
          >
            <X size={20} color="$destructiveForeground" />
            <Text color="$destructiveForeground" fontWeight="600">Close</Text>
          </Button>
        </YStack>
      </View>
    );
  }

  // Error state from API call
  if (createBookmarkMutation.isError) {
    return (
      <View flex={1} backgroundColor="$background">
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$4">
          <Circle
            size={80}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <AlertTriangle size={40} color="$primaryForeground" />
          </Circle>

          <YStack gap="$2" alignItems="center">
            <H2 color="$primary" textAlign="center">
              Already Saved
            </H2>
            <Paragraph color="$foreground" textAlign="center" opacity={0.8}>
              This bookmark already exists in your SaveIt collection
            </Paragraph>
          </YStack>

          <Button
            size="$4"
            onPress={handleCancel}
            backgroundColor="$primary"
            borderRadius="$4"
            fontWeight="600"
          >
            <X size={20} color="$primaryForeground" />
            <Text color="$primaryForeground" fontWeight="600">Close</Text>
          </Button>
        </YStack>
      </View>
    );
  }

  // Success state
  if (createBookmarkMutation.isSuccess) {
    return (
      <View flex={1} backgroundColor="$background">
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$4">
          <Circle
            size={80}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <Check size={40} color="$primaryForeground" />
          </Circle>

          <YStack gap="$2" alignItems="center">
            <H2 color="$primary" textAlign="center">
              Saved Successfully!
            </H2>
            <Paragraph color="$foreground" textAlign="center" opacity={0.8}>
              Your bookmark has been added to SaveIt
            </Paragraph>
          </YStack>

          <XStack alignItems="center" gap="$2" opacity={0.6}>
            <Bookmark size={16} color="$foreground" />
            <Text fontSize="$3" color="$foreground">
              Added to your collection
            </Text>
          </XStack>
        </YStack>
      </View>
    );
  }

  // Loading state
  if (createBookmarkMutation.isPending) {
    return (
      <View flex={1} backgroundColor="$background">
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$4">
          <Circle
            size={80}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <Spinner size="large" color="$primaryForeground" />
          </Circle>

          <YStack gap="$2" alignItems="center">
            <H2 color="$foreground" textAlign="center">
              Saving Bookmark
            </H2>
            <Paragraph color="$foreground" textAlign="center" opacity={0.8}>
              Adding to your SaveIt collection...
            </Paragraph>
          </YStack>

          <XStack alignItems="center" gap="$2" opacity={0.6}>
            <View
              width={4}
              height={4}
              borderRadius="$10"
              backgroundColor="$primary"
              animation="bouncy"
              animateOnly={["scale"]}
              scale={1.2}
            />
            <View
              width={4}
              height={4}
              borderRadius="$10"
              backgroundColor="$primary"
              animation="bouncy"
              animateOnly={["scale"]}
              scale={1.2}
              animationDelay={200}
            />
            <View
              width={4}
              height={4}
              borderRadius="$10"
              backgroundColor="$primary"
              animation="bouncy"
              animateOnly={["scale"]}
              scale={1.2}
              animationDelay={400}
            />
          </XStack>
        </YStack>
      </View>
    );
  }

  // This should never be reached now since we redirect immediately
  // if there's no share intent, but just in case show a loading state

  return (
    <View flex={1} backgroundColor="$background">
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Spinner size="large" color="$primary" />
      </YStack>
    </View>
  );
}
