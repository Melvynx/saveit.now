import { normalizePreviewDataUrl } from "./preview";
import {
  type CaptureResult,
  isRetryableUploadError,
  type OpenSaveItPath,
  parseTabSaveMessage,
  type RuntimeRequest,
  type RuntimeRequestType,
  type RuntimeResponseForRequest,
  type SaveBookmarkResult,
  type SaveType,
  type SessionResult,
  type TabSaveMessage,
  type UploadResult,
} from "./protocol";
import { createSaverUI, SAVER_STATE, type SaverUI } from "./saver-ui";
import {
  isSameDocumentUrl,
  shouldCaptureClientPreview,
  shouldUsePageContext,
} from "./url-policy";
import {
  extractYouTubeTranscript,
  isYouTubeVideoPage,
  waitForYouTubePlayer,
} from "./youtube-transcript";

type PreviewRetry = {
  bookmarkId: string;
  expectedPageUrl: string;
  screenshotDataUrl?: string;
};

const RUNTIME_TIMEOUTS: Record<RuntimeRequestType, number> = {
  GET_SESSION: 12_000,
  SAVE_BOOKMARK: 32_000,
  CAPTURE_SCREENSHOT: 12_000,
  UPLOAD_SCREENSHOT: 32_000,
  OPEN_SAVEIT: 5_000,
};

function sendRuntimeMessage<T extends RuntimeRequest>(
  message: T,
): Promise<RuntimeResponseForRequest<T> | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (response: RuntimeResponseForRequest<T> | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(response);
    };
    const timeoutId = window.setTimeout(
      () => finish(null),
      RUNTIME_TIMEOUTS[message.type],
    );

    try {
      chrome.runtime.sendMessage(
        message,
        (response: RuntimeResponseForRequest<T> | undefined) => {
          if (chrome.runtime.lastError) {
            finish(null);
            return;
          }
          finish(response ?? null);
        },
      );
    } catch {
      finish(null);
    }
  });
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

class SaveController {
  private operationInFlight = false;
  private readonly pendingTargets: TabSaveMessage[] = [];
  private previewRetry: PreviewRetry | null = null;
  private currentTarget: TabSaveMessage = {
    action: "saveBookmark",
    type: "page",
    url: window.location.href,
  };

  constructor(private readonly ui: SaverUI) {}

  requestSave(target: TabSaveMessage): "duplicate" | "queued" | "received" {
    if (this.operationInFlight) {
      if (
        this.isSameTarget(target, this.currentTarget) ||
        this.pendingTargets.some((queuedTarget) =>
          this.isSameTarget(target, queuedTarget),
        )
      ) {
        return "duplicate";
      }
      this.pendingTargets.push(target);
      return "queued";
    }

    this.startSave(target);
    return "received";
  }

  private startSave(target: TabSaveMessage): void {
    this.runExclusive(async () => {
      this.currentTarget = target;
      this.previewRetry = null;
      await this.saveContent(target);
    });
  }

  private isSameTarget(left: TabSaveMessage, right: TabSaveMessage): boolean {
    return left.type === right.type && left.url === right.url;
  }

  retry(): void {
    this.runExclusive(async () => {
      const retry = this.previewRetry;
      if (retry) {
        const previewUploaded = await this.createOrUploadPreview(retry);
        if (previewUploaded) {
          this.ui.render({
            state: SAVER_STATE.SUCCESS,
            saveType: this.currentTarget.type,
            message: "Preview added.",
          });
        }
        return;
      }

      await this.saveContent(this.currentTarget);
    });
  }

  openSaveIt(path: OpenSaveItPath): void {
    void sendRuntimeMessage({ type: "OPEN_SAVEIT", path });
  }

  private runExclusive(operation: () => Promise<void>): void {
    if (this.operationInFlight) return;
    this.operationInFlight = true;
    void operation()
      .catch(() => {
        this.ui.render({
          state: SAVER_STATE.ERROR,
          saveType: this.currentTarget.type,
          message: "An unexpected error interrupted the save.",
          allowRetry: true,
        });
      })
      .finally(() => {
        this.operationInFlight = false;
        const nextTarget = this.pendingTargets.shift();
        if (nextTarget) this.startSave(nextTarget);
      });
  }

  private async getSession(): Promise<SessionResult> {
    return (
      (await sendRuntimeMessage({ type: "GET_SESSION" })) ?? {
        session: null,
        error: "The extension could not reach SaveIt.",
        errorType: "NETWORK_ERROR",
      }
    );
  }

  private async saveBookmark(
    url: string,
    transcript?: string,
    metadata?: Record<string, unknown>,
  ): Promise<SaveBookmarkResult> {
    return (
      (await sendRuntimeMessage({
        type: "SAVE_BOOKMARK",
        url,
        transcript,
        metadata,
      })) ?? {
        success: false,
        error: "The extension could not reach SaveIt.",
        errorType: "NETWORK_ERROR",
      }
    );
  }

  private async captureScreenshot(
    expectedPageUrl: string,
  ): Promise<CaptureResult> {
    return (
      (await sendRuntimeMessage({
        type: "CAPTURE_SCREENSHOT",
        expectedPageUrl,
      })) ?? {
        success: false,
        error: "The extension could not ask Chrome for a preview.",
        errorType: "CAPTURE_FAILED",
      }
    );
  }

  private async uploadScreenshot(
    bookmarkId: string,
    screenshotDataUrl: string,
  ): Promise<UploadResult> {
    return (
      (await sendRuntimeMessage({
        type: "UPLOAD_SCREENSHOT",
        bookmarkId,
        screenshotDataUrl,
      })) ?? {
        success: false,
        error: "The extension could not upload the preview.",
        errorType: "NETWORK_ERROR",
      }
    );
  }

  private showSaveFailure(
    result: Extract<SaveBookmarkResult, { success: false }>,
  ) {
    switch (result.errorType) {
      case "AUTH_REQUIRED":
        this.ui.render({
          state: SAVER_STATE.AUTH_REQUIRED,
          saveType: this.currentTarget.type,
        });
        return;
      case "BOOKMARK_ALREADY_EXISTS":
        this.ui.render({
          state: SAVER_STATE.BOOKMARK_EXISTS,
          saveType: this.currentTarget.type,
        });
        return;
      case "MAX_BOOKMARKS":
        this.ui.render({
          state: SAVER_STATE.MAX_BOOKMARKS,
          saveType: this.currentTarget.type,
        });
        return;
      case "NETWORK_ERROR":
        this.ui.render({
          state: SAVER_STATE.ERROR,
          saveType: this.currentTarget.type,
          message: "Check your connection and try again.",
          allowRetry: true,
        });
        return;
      case "RATE_LIMITED":
        this.ui.render({
          state: SAVER_STATE.ERROR,
          saveType: this.currentTarget.type,
          message: "Too many requests. Try again shortly.",
          allowRetry: true,
        });
        return;
      case "SERVER_ERROR":
        this.ui.render({
          state: SAVER_STATE.ERROR,
          saveType: this.currentTarget.type,
          message: "Something went wrong. Please try again.",
          allowRetry: true,
        });
        return;
      case "UNKNOWN":
        this.ui.render({
          state: SAVER_STATE.ERROR,
          saveType: this.currentTarget.type,
          message: result.error,
          allowRetry: true,
        });
    }
  }

  private showPreviewFailure(
    result: Extract<UploadResult, { success: false }>,
    retry: PreviewRetry | null,
  ): void {
    this.previewRetry = retry;

    if (result.errorType === "AUTH_REQUIRED") {
      this.ui.render({
        state: SAVER_STATE.SCREENSHOT_ERROR,
        saveType: this.currentTarget.type,
        message: "Sign in again to add the preview.",
        allowRetry: false,
        link: { label: "Sign in", path: "/signin", variant: "primary" },
      });
      return;
    }

    const deterministicMessages: Partial<
      Record<typeof result.errorType, string>
    > = {
      FILE_TOO_LARGE: "The preview image was too large to upload.",
      INVALID_FILE: "Chrome returned an invalid preview image.",
      NOT_FOUND: "This bookmark no longer accepts a preview.",
    };
    this.ui.render({
      state: SAVER_STATE.SCREENSHOT_ERROR,
      saveType: this.currentTarget.type,
      message: deterministicMessages[result.errorType] ?? result.error,
      allowRetry: retry !== null,
    });
  }

  private async createOrUploadPreview(retry: PreviewRetry): Promise<boolean> {
    let screenshotDataUrl = retry.screenshotDataUrl;
    if (!screenshotDataUrl) {
      this.ui.render({
        state: SAVER_STATE.CAPTURING_SCREENSHOT,
        saveType: this.currentTarget.type,
      });
      await wait(180);
      await this.ui.hideForCapture();

      if (!isSameDocumentUrl(window.location.href, retry.expectedPageUrl)) {
        this.previewRetry = retry;
        this.ui.render({
          state: SAVER_STATE.SCREENSHOT_ERROR,
          saveType: this.currentTarget.type,
          message: "The page changed. Go back to it and retry.",
          allowRetry: true,
        });
        return false;
      }

      const capture = await this.captureScreenshot(retry.expectedPageUrl);
      if (!capture.success) {
        this.previewRetry = {
          bookmarkId: retry.bookmarkId,
          expectedPageUrl: retry.expectedPageUrl,
        };
        this.ui.render({
          state: SAVER_STATE.SCREENSHOT_ERROR,
          saveType: this.currentTarget.type,
          message: capture.error,
          allowRetry: true,
        });
        return false;
      }

      const normalized = await normalizePreviewDataUrl(
        capture.screenshotDataUrl,
      );
      if (!normalized.success) {
        this.previewRetry = null;
        this.ui.render({
          state: SAVER_STATE.SCREENSHOT_ERROR,
          saveType: this.currentTarget.type,
          message: normalized.error,
          allowRetry: false,
        });
        return false;
      }
      screenshotDataUrl = normalized.dataUrl;
    }

    this.ui.render({
      state: SAVER_STATE.LOADING,
      saveType: this.currentTarget.type,
      title: "Adding preview…",
    });
    const upload = await this.uploadScreenshot(
      retry.bookmarkId,
      screenshotDataUrl,
    );
    if (!upload.success) {
      const nextRetry = isRetryableUploadError(upload.errorType)
        ? {
            bookmarkId: retry.bookmarkId,
            expectedPageUrl: retry.expectedPageUrl,
            screenshotDataUrl,
          }
        : null;
      this.showPreviewFailure(upload, nextRetry);
      return false;
    }

    this.previewRetry = null;
    return true;
  }

  private async saveContent(target: TabSaveMessage): Promise<void> {
    this.ui.render({
      state: SAVER_STATE.LOADING,
      saveType: target.type,
    });

    const session = await this.getSession();
    if (!session.session) {
      if (session.errorType === "NETWORK_ERROR") {
        this.ui.render({
          state: SAVER_STATE.ERROR,
          saveType: target.type,
          message: session.error,
          allowRetry: true,
        });
      } else {
        this.ui.render({
          state: SAVER_STATE.AUTH_REQUIRED,
          saveType: target.type,
        });
      }
      return;
    }

    const sourcePageUrl = window.location.href;
    const canUsePageContext = shouldUsePageContext(
      target.type,
      target.url,
      sourcePageUrl,
    );
    let transcript: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (canUsePageContext && isYouTubeVideoPage()) {
      this.ui.setMessage("Waiting for the player…");
      const playerReady = await waitForYouTubePlayer(5_000);
      if (playerReady) {
        this.ui.setMessage("Grabbing the transcript…");
        const transcriptResult = await extractYouTubeTranscript(target.url);
        if (transcriptResult) {
          transcript = transcriptResult.transcript;
          metadata = {
            youtubeTranscript: {
              source: transcriptResult.source,
              videoId: transcriptResult.videoId,
              extractedAt: transcriptResult.extractedAt,
            },
          };
        }
      }
    }

    this.ui.setMessage("");
    const result = await this.saveBookmark(target.url, transcript, metadata);
    if (!result.success) {
      this.showSaveFailure(result);
      return;
    }

    if (
      shouldCaptureClientPreview(target.type, target.url, sourcePageUrl) &&
      !(await this.createOrUploadPreview({
        bookmarkId: result.bookmarkId,
        expectedPageUrl: sourcePageUrl,
      }))
    ) {
      return;
    }

    this.ui.render({
      state: SAVER_STATE.SUCCESS,
      saveType: target.type,
    });
  }
}

type SaveItContentGlobal = typeof globalThis & {
  __saveItContentInitialized?: boolean;
};

function initializeContentScript(): void {
  let controller: SaveController | null = null;
  const ui = createSaverUI({
    onDismiss: () => undefined,
    onRetry: () => controller?.retry(),
    onOpenPath: (path) => controller?.openSaveIt(path),
  });
  controller = new SaveController(ui);

  chrome.runtime.onMessage.addListener(
    (rawMessage: unknown, _sender, sendResponse) => {
      const message = parseTabSaveMessage(rawMessage, window.location.href);
      if (!message) return false;

      const status = controller?.requestSave(message) ?? "queued";
      sendResponse({ status });
      return false;
    },
  );
}

const contentGlobal = globalThis as SaveItContentGlobal;
if (!contentGlobal.__saveItContentInitialized) {
  initializeContentScript();
  contentGlobal.__saveItContentInitialized = true;
}
