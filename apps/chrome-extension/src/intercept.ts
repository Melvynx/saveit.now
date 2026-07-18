import { MAX_TRANSCRIPT_LENGTH } from "./domain.ts";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const currentScript = document.currentScript as HTMLScriptElement | null;
const requestId = currentScript?.dataset.saveitRequestId ?? "";
const videoId = currentScript?.dataset.saveitVideoId ?? "";
const targetOrigin = window.location.origin;
const runningKey = "__saveItTranscriptExtractionRequest";
const pageState = window as unknown as Record<string, unknown>;

type TranscriptResultType =
  | "TRANSCRIPT_EXTRACTED"
  | "TRANSCRIPT_EXTRACTION_FAILED";

function postResult(
  type: TranscriptResultType,
  payload: Record<string, unknown> = {},
): void {
  window.postMessage({ type, requestId, videoId, ...payload }, targetOrigin);
}

function fail(reason: string): void {
  postResult("TRANSCRIPT_EXTRACTION_FAILED", { reason });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHostOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function getVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !isHostOrSubdomain(url.hostname, "youtube.com")
    ) {
      return null;
    }

    if (url.pathname === "/watch") {
      const watchVideoId = url.searchParams.get("v");
      return watchVideoId && VIDEO_ID_PATTERN.test(watchVideoId)
        ? watchVideoId
        : null;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const pathKind = pathParts[0];
    const pathVideoId = pathParts[1];
    if (
      pathParts.length === 2 &&
      typeof pathKind === "string" &&
      typeof pathVideoId === "string" &&
      ["embed", "live", "shorts", "v"].includes(pathKind) &&
      VIDEO_ID_PATTERN.test(pathVideoId)
    ) {
      return pathVideoId;
    }
  } catch {
    return null;
  }

  return null;
}

function getExpectedTranscriptUrl(value: string): string | null {
  try {
    const url = new URL(value, window.location.href);
    if (
      url.protocol !== "https:" ||
      !isHostOrSubdomain(url.hostname, "youtube.com") ||
      url.pathname !== "/api/timedtext" ||
      url.searchParams.get("v") !== videoId
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function isExpectedVideo(): boolean {
  return getVideoId(window.location.href) === videoId;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function appendText(current: string, text: unknown): string {
  if (current.length >= MAX_TRANSCRIPT_LENGTH || typeof text !== "string") {
    return current;
  }

  const normalizedText = text.trim();
  if (!normalizedText) return current;

  const prefix = current ? " " : "";
  const remainingLength = MAX_TRANSCRIPT_LENGTH - current.length;
  return current + `${prefix}${normalizedText}`.slice(0, remainingLength);
}

function parseJsonTranscript(payload: unknown): string {
  if (!isPlainRecord(payload) || !Array.isArray(payload.events)) return "";

  let transcript = "";
  for (const event of payload.events) {
    if (!isPlainRecord(event) || !Array.isArray(event.segs)) continue;
    for (const segment of event.segs) {
      if (!isPlainRecord(segment)) continue;
      transcript = appendText(transcript, segment.utf8);
      if (transcript.length >= MAX_TRANSCRIPT_LENGTH) return transcript;
    }
  }
  return transcript;
}

function parseXmlTranscript(xml: string): string {
  const documentNode = new DOMParser().parseFromString(xml, "text/xml");
  if (documentNode.querySelector("parsererror")) return "";

  let transcript = "";
  for (const element of documentNode.querySelectorAll("text")) {
    transcript = appendText(transcript, element.textContent ?? "");
    if (transcript.length >= MAX_TRANSCRIPT_LENGTH) break;
  }
  return transcript;
}

async function parseTranscriptResponse(response: Response): Promise<string> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.toLowerCase().includes("json")) {
    return parseJsonTranscript(await response.json());
  }
  return parseXmlTranscript(await response.text());
}

function installXhrInterceptor(
  onTranscriptUrl: (url: string) => void,
): () => void {
  const requestUrls = new WeakMap<XMLHttpRequest, string>();
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  const interceptedOpen = function (
    this: XMLHttpRequest,
    ...args: unknown[]
  ): unknown {
    const expectedUrl = getExpectedTranscriptUrl(String(args[1] ?? ""));
    if (expectedUrl) requestUrls.set(this, expectedUrl);
    return Reflect.apply(originalOpen, this, args);
  } as typeof XMLHttpRequest.prototype.open;

  const interceptedSend = function (
    this: XMLHttpRequest,
    ...args: unknown[]
  ): unknown {
    const expectedUrl = requestUrls.get(this);
    if (expectedUrl) onTranscriptUrl(expectedUrl);
    return Reflect.apply(originalSend, this, args);
  } as typeof XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = interceptedOpen;
  XMLHttpRequest.prototype.send = interceptedSend;

  return () => {
    if (XMLHttpRequest.prototype.open === interceptedOpen) {
      XMLHttpRequest.prototype.open = originalOpen;
    }
    if (XMLHttpRequest.prototype.send === interceptedSend) {
      XMLHttpRequest.prototype.send = originalSend;
    }
  };
}

async function triggerTranscriptRequest(
  subtitleButton: HTMLElement,
): Promise<void> {
  const subtitlesWereEnabled =
    subtitleButton.getAttribute("aria-pressed") === "true";

  if (subtitlesWereEnabled) {
    subtitleButton.click();
    await wait(250);
  }

  subtitleButton.click();
  await wait(1_600);
}

function restoreSubtitleState(
  subtitleButton: HTMLElement,
  shouldBeEnabled: boolean,
): void {
  const subtitlesAreEnabled =
    subtitleButton.getAttribute("aria-pressed") === "true";
  if (subtitlesAreEnabled !== shouldBeEnabled) subtitleButton.click();
}

if (!requestId || !VIDEO_ID_PATTERN.test(videoId)) {
  fail("The transcript request was invalid.");
} else if (!isExpectedVideo()) {
  fail("The active YouTube video changed before extraction.");
} else if (pageState[runningKey]) {
  fail("Transcript extraction is already running.");
} else {
  pageState[runningKey] = requestId;

  void (async () => {
    let restoreXhr = (): void => undefined;
    let subtitleButton: HTMLElement | null = null;
    let subtitlesWereEnabled = false;

    try {
      let transcriptUrl: string | null = null;
      restoreXhr = installXhrInterceptor((url) => {
        transcriptUrl = url;
      });

      subtitleButton = document.querySelector<HTMLElement>(
        ".ytp-subtitles-button.ytp-button",
      );
      if (!subtitleButton) {
        throw new Error("This video does not expose a captions control.");
      }

      subtitlesWereEnabled =
        subtitleButton.getAttribute("aria-pressed") === "true";
      await triggerTranscriptRequest(subtitleButton);

      if (!isExpectedVideo()) {
        throw new Error("The active YouTube video changed during extraction.");
      }
      if (!transcriptUrl) {
        throw new Error("No public transcript request was detected.");
      }

      const verifiedTranscriptUrl = getExpectedTranscriptUrl(transcriptUrl);
      if (!verifiedTranscriptUrl) {
        throw new Error("The transcript response did not match this video.");
      }

      const response = await fetch(verifiedTranscriptUrl, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(
          `Transcript request failed with status ${response.status}.`,
        );
      }
      if (!isExpectedVideo()) {
        throw new Error("The active YouTube video changed during extraction.");
      }

      const transcript = (await parseTranscriptResponse(response)).slice(
        0,
        MAX_TRANSCRIPT_LENGTH,
      );
      if (!transcript) {
        throw new Error(
          "The captions response did not contain transcript text.",
        );
      }

      postResult("TRANSCRIPT_EXTRACTED", { transcript });
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : "Transcript extraction failed.",
      );
    } finally {
      restoreXhr();
      if (subtitleButton) {
        restoreSubtitleState(subtitleButton, subtitlesWereEnabled);
      }
      if (pageState[runningKey] === requestId) delete pageState[runningKey];
    }
  })();
}
