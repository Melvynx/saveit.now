import { AlertTriangle, Bookmark, Check, X } from "@tamagui/lucide-icons";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import React, { useEffect, useState } from "react";
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
import { api } from "@convex/_generated/api";

type MutationStatus = "idle" | "pending" | "success" | "error";

export default function ShareHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntentContext();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<MutationStatus>("idle");

  const createBookmark = useMutation(api.bookmarks.mutations.create);

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
      status === "idle"
    ) {
      handleSharedContent();
    }
  }, [hasShareIntent, shareIntent]);

  const handleSharedContent = async () => {
    if (!shareIntent) {
      return;
    }

    setStatus("pending");

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
      if (file && file.mimeType?.startsWith("image/")) {
        // For images, use placeholder URL. The Convex backend will process later.
        // TODO: When api.files.actions.uploadR2 is available, upload first then create.
        url = `placeholder-image-upload-${Date.now()}`;
        metadata = {
          type: "image",
          fileName: file.fileName || "Shared image",
          mimeType: file.mimeType,
          fileSize: file.size,
        };
      } else if (file) {
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
      setStatus("idle");
      return;
    }

    try {
      await createBookmark({ url, metadata });
      setStatus("success");
      // Show success for 2 seconds, then close
      setTimeout(() => {
        resetShareIntent();
        router.dismiss();
      }, 2000);
    } catch {
      setStatus("error");
      // Show error UI for 3 seconds, then close
      setTimeout(() => {
        resetShareIntent();
        router.dismiss();
      }, 3000);
    }
  };

  const handleCancel = () => {
    resetShareIntent();
    router.dismiss();
  };

  // Share-intent error state
  if (error) {
    return (
      <View flex={1} backgroundColor="$background">
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          padding="$4"
          gap="$4"
        >
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
            <Text color="$destructiveForeground" fontWeight="600">
              Close
            </Text>
          </Button>
        </YStack>
      </View>
    );
  }

  // Error state from Convex mutation (e.g. already exists)
  if (status === "error") {
    return (
      <View flex={1} backgroundColor="$background">
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          padding="$4"
          gap="$4"
        >
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
            <Text color="$primaryForeground" fontWeight="600">
              Close
            </Text>
          </Button>
        </YStack>
      </View>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <View flex={1} backgroundColor="$background">
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          padding="$4"
          gap="$4"
        >
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

  // Loading / pending state
  return (
    <View flex={1} backgroundColor="$background">
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        padding="$4"
        gap="$4"
      >
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
          />
          <View
            width={4}
            height={4}
            borderRadius="$10"
            backgroundColor="$primary"
            animation="bouncy"
            animateOnly={["scale"]}
            scale={1.2}
          />
        </XStack>
      </YStack>
    </View>
  );
}
