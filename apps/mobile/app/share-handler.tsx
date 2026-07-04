import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { type ShareIntent, useShareIntentContext } from "expo-share-intent";
import { useEffect, useRef, useState } from "react";

import {
  ShareSaveDialog,
  type ShareSaveError,
} from "../src/components/share/share-save-dialog";
import { useAuth } from "../src/contexts/AuthContext";
import { hapticSuccess, hapticWarning } from "../src/lib/haptics";
import {
  getShareIntentPayload,
  type ShareIntentPayload,
  type ShareIntentPayloadError,
} from "../src/lib/share-intent-payload";
import type { SignInStep } from "../src/screens/SignInScreen";

function mutationErrorToCopy(error: unknown): ShareSaveError {
  const rawMessage =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  const message = rawMessage.replace(/^Error:\s*/i, "").trim();

  if (/already exists|duplicate/i.test(message)) {
    return {
      title: "Already saved",
      message: "This link is already in your SaveIt library.",
      retryable: false,
    };
  }

  if (/unauthorized|not authenticated|not logged in/i.test(message)) {
    return {
      title: "Sign in again",
      message:
        "Your session was not ready. Sign in again, then retry the save.",
      retryable: true,
    };
  }

  if (/limit|maximum/i.test(message)) {
    return {
      title: "Limit reached",
      message:
        "Your current plan limit was reached. Open SaveIt to manage your plan or remove older bookmarks.",
      retryable: false,
    };
  }

  if (/invalid url|only http|https urls|url host/i.test(message)) {
    return {
      title: "Unsupported link",
      message:
        "SaveIt can only save public HTTP or HTTPS links from the share sheet.",
      retryable: false,
    };
  }

  return {
    title: "Could not save",
    message: "Something went wrong while saving this link. Please try again.",
    retryable: true,
  };
}

function getShareIntentSignature(shareIntent: ShareIntent) {
  const fileSignature =
    shareIntent.files?.map((file) => file.mimeType ?? "").join("|") ?? "";

  return [
    shareIntent.webUrl ?? "",
    shareIntent.text ?? "",
    shareIntent.type ?? "",
    shareIntent.meta?.title ?? "",
    fileSignature,
  ].join("::");
}

export default function ShareHandler() {
  const {
    isReady,
    hasShareIntent,
    shareIntent,
    resetShareIntent,
    error: shareIntentError,
  } = useShareIntentContext();
  const router = useRouter();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const createBookmark = useMutation(api.bookmarks.mutations.create);

  const [payload, setPayload] = useState<ShareIntentPayload | null>(null);
  const [payloadError, setPayloadError] =
    useState<ShareIntentPayloadError | null>(null);
  const [hasStartedCreate, setHasStartedCreate] = useState(false);
  const [saveError, setSaveError] = useState<ShareSaveError | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [signInStep, setSignInStep] = useState<SignInStep>("email");
  const emptyStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedShareIntentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    if (!hasShareIntent) {
      if (payload || payloadError) return;

      emptyStateTimerRef.current = setTimeout(() => {
        setPayloadError({
          code: "empty",
          title: "Nothing to save",
          message: "SaveIt could not find a link in this share.",
        });
      }, 4000);
      return () => {
        if (emptyStateTimerRef.current) {
          clearTimeout(emptyStateTimerRef.current);
          emptyStateTimerRef.current = null;
        }
      };
    }

    const shareIntentSignature = getShareIntentSignature(shareIntent);
    const hasNewShareIntent =
      lastProcessedShareIntentRef.current !== shareIntentSignature;

    if (!hasNewShareIntent && (payload || payloadError)) return;

    if (hasNewShareIntent) {
      lastProcessedShareIntentRef.current = shareIntentSignature;
      setPayload(null);
      setPayloadError(null);
      setHasStartedCreate(false);
      setSaveError(null);
    }

    if (emptyStateTimerRef.current) {
      clearTimeout(emptyStateTimerRef.current);
      emptyStateTimerRef.current = null;
    }

    const result = getShareIntentPayload(shareIntent);
    if (result.ok) {
      setPayload(result.payload);
    } else {
      setPayloadError(result.error);
      hapticWarning();
    }
  }, [hasShareIntent, isReady, payload, payloadError, shareIntent]);

  useEffect(() => {
    if (!hasShareIntent || payloadError?.code !== "empty") return;
    setPayloadError(null);
  }, [hasShareIntent, payloadError?.code]);

  useEffect(() => {
    if (!payload || !isAuthenticated || hasStartedCreate || saveError) {
      return;
    }

    let cancelled = false;
    setHasStartedCreate(true);

    void createBookmark({
      url: payload.url,
      metadata: payload.metadata,
    })
      .then(() => {
        if (cancelled) return;
        hapticSuccess();
        resetShareIntent();
        router.replace("/(tabs)");
      })
      .catch((err) => {
        if (cancelled) return;
        hapticWarning();
        setSaveError(mutationErrorToCopy(err));
      });

    return () => {
      cancelled = true;
    };
  }, [
    createBookmark,
    hasStartedCreate,
    isAuthenticated,
    payload,
    resetShareIntent,
    router,
    saveError,
  ]);

  const closeShareFlow = () => {
    resetShareIntent();
    router.replace("/(tabs)");
  };

  const retrySave = () => {
    setSaveError(null);
    setHasStartedCreate(false);
  };

  const needsAuth = Boolean(payload && !isAuthLoading && !user);
  const activeError =
    payloadError ??
    (shareIntentError
      ? {
          code: "empty",
          title: "Share error",
          message:
            "SaveIt could not read this share. Close this dialog and try sharing the link again.",
        }
      : null) ??
    saveError;

  const headerStatus = activeError ? "error" : needsAuth ? "auth" : "loading";

  const title = activeError
    ? activeError.title
    : needsAuth
      ? "Sign in to save"
      : "Saving to SaveIt";

  const message = activeError
    ? activeError.message
    : needsAuth
      ? "Use your SaveIt account and this share will continue automatically."
      : "Adding the shared link to your library.";

  return (
    <ShareSaveDialog
      title={title}
      message={message}
      headerStatus={headerStatus}
      payload={payload}
      activeError={activeError}
      needsAuth={needsAuth}
      email={email}
      otp={otp}
      signInStep={signInStep}
      onEmailChange={setEmail}
      onOtpChange={setOtp}
      onSignInStepChange={setSignInStep}
      saveError={saveError}
      onClose={closeShareFlow}
      onRetry={retrySave}
    />
  );
}
