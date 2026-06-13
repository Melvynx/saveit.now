import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import React, { useEffect, useState } from "react";

import { Button } from "../src/components/ui/button";
import { StatusScreen } from "../src/components/ui/status-screen";
import { hapticSuccess } from "../src/lib/haptics";

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

    if (hasShareIntent && shareIntent && status === "idle") {
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
      hapticSuccess();
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
      <StatusScreen
        icon="alert-circle-outline"
        title="Share Error"
        message={
          typeof error === "string"
            ? error
            : (error as any)?.message || "Unable to process shared content"
        }
        footer={
          <Button onPress={handleCancel} className="self-stretch">
            Close
          </Button>
        }
      />
    );
  }

  // Error state from Convex mutation (e.g. already exists)
  if (status === "error") {
    return (
      <StatusScreen
        icon="bookmark"
        title="Already Saved"
        message="This bookmark already exists in your SaveIt collection"
        footer={
          <Button onPress={handleCancel} className="self-stretch">
            Close
          </Button>
        }
      />
    );
  }

  // Success state
  if (status === "success") {
    return (
      <StatusScreen
        icon="checkmark"
        title="Saved Successfully!"
        message="Your bookmark has been added to SaveIt"
      />
    );
  }

  // Loading / pending state
  return (
    <StatusScreen
      spinner
      title="Saving Bookmark"
      message="Adding to your SaveIt collection..."
    />
  );
}
