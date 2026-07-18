import { getYouTubeVideoId, MAX_TRANSCRIPT_LENGTH } from "./url-policy";

type TranscriptSource = "xhr-interception" | "page" | "api" | "captions";

interface TranscriptEntry {
  text: string;
  start: number;
}

interface YouTubeTranscriptResult {
  transcript: string;
  source: TranscriptSource;
  videoId: string;
  extractedAt: string;
}

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
};

type PlayerResponse = {
  videoDetails?: {
    videoId?: string;
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
};

type TimedTextEvent = {
  tStartMs?: number;
  segs?: Array<{ utf8?: string }>;
};

const MIN_TRANSCRIPT_LENGTH = 50;
const PLAYER_RESPONSE_MARKERS = [
  "var ytInitialPlayerResponse =",
  "ytInitialPlayerResponse =",
  '"ytInitialPlayerResponse":',
];

function capTranscript(transcript: string): string {
  return transcript.trim().slice(0, MAX_TRANSCRIPT_LENGTH);
}

function isCurrentVideo(expectedVideoId: string): boolean {
  return getYouTubeVideoId(window.location.href) === expectedVideoId;
}

function isYouTubeHostname(hostname: string): boolean {
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}

function getTrustedCaptionUrl(
  baseUrl: string,
  expectedVideoId: string,
): string | null {
  try {
    const captionUrl = new URL(baseUrl, window.location.href);
    if (
      captionUrl.protocol !== "https:" ||
      !isYouTubeHostname(captionUrl.hostname) ||
      captionUrl.pathname !== "/api/timedtext" ||
      captionUrl.searchParams.get("v") !== expectedVideoId
    ) {
      return null;
    }

    return captionUrl.href;
  } catch {
    return null;
  }
}

function extractJsonObject(source: string, startIndex: number): string | null {
  const objectStart = source.indexOf("{", startIndex);
  if (objectStart === -1) return null;

  let depth = 0;
  let escaped = false;
  let insideString = false;

  for (let index = objectStart; index < source.length; index += 1) {
    const character = source[index];
    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        insideString = false;
      }
      continue;
    }

    if (character === '"') {
      insideString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(objectStart, index + 1);
    }
  }

  return null;
}

function parsePlayerResponse(scriptContent: string): PlayerResponse | null {
  for (const marker of PLAYER_RESPONSE_MARKERS) {
    const markerIndex = scriptContent.indexOf(marker);
    if (markerIndex === -1) continue;

    const json = extractJsonObject(scriptContent, markerIndex + marker.length);
    if (!json) continue;

    try {
      return JSON.parse(json) as PlayerResponse;
    } catch {
      continue;
    }
  }

  return null;
}

async function extractTranscriptFromPageData(
  expectedVideoId: string,
): Promise<string | null> {
  if (!isCurrentVideo(expectedVideoId)) return null;

  for (const script of Array.from(document.querySelectorAll("script"))) {
    const playerResponse = parsePlayerResponse(script.textContent ?? "");
    if (playerResponse?.videoDetails?.videoId !== expectedVideoId) continue;

    const captionTracks =
      playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks?.length) continue;

    const preferredCaption =
      captionTracks.find(
        (track) =>
          track.languageCode === "en" || track.languageCode === "en-US",
      ) ?? captionTracks[0];
    if (!preferredCaption?.baseUrl) continue;

    const captionUrl = getTrustedCaptionUrl(
      preferredCaption.baseUrl,
      expectedVideoId,
    );
    if (!captionUrl) continue;

    try {
      const response = await fetch(captionUrl, {
        credentials: "same-origin",
      });
      if (!response.ok || !isCurrentVideo(expectedVideoId)) continue;
      return parseXmlTranscript(await response.text());
    } catch {
      continue;
    }
  }

  return null;
}

function createRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function extractTranscriptFromXHRInterception(
  expectedVideoId: string,
): Promise<string | null> {
  if (!isCurrentVideo(expectedVideoId)) return null;

  return new Promise((resolve) => {
    let settled = false;
    const requestId = createRequestId();
    const script = document.createElement("script");

    const settle = (transcript: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", messageListener);
      script.remove();
      resolve(transcript ? capTranscript(transcript) : null);
    };

    const messageListener = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== window.location.origin ||
        !event.data ||
        typeof event.data !== "object"
      ) {
        return;
      }

      const data = event.data as Record<string, unknown>;
      if (
        data.requestId !== requestId ||
        data.videoId !== expectedVideoId ||
        !isCurrentVideo(expectedVideoId)
      ) {
        return;
      }

      if (data.type === "TRANSCRIPT_EXTRACTED") {
        settle(typeof data.transcript === "string" ? data.transcript : null);
      } else if (data.type === "TRANSCRIPT_EXTRACTION_FAILED") {
        settle(null);
      }
    };

    const timeoutId = window.setTimeout(() => settle(null), 8_000);
    window.addEventListener("message", messageListener);

    script.src = chrome.runtime.getURL("intercept.js");
    script.dataset.saveitRequestId = requestId;
    script.dataset.saveitVideoId = expectedVideoId;
    script.addEventListener("error", () => settle(null), { once: true });
    document.documentElement.appendChild(script);
  });
}

async function extractTranscriptFromAPI(
  expectedVideoId: string,
): Promise<string | null> {
  if (!isCurrentVideo(expectedVideoId)) return null;

  try {
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?lang=en&v=${expectedVideoId}&fmt=json3`,
      {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok || !isCurrentVideo(expectedVideoId)) return null;

    const payload = (await response.json()) as { events?: TimedTextEvent[] };
    return payload.events ? formatTranscriptFromEvents(payload.events) : null;
  } catch {
    return null;
  }
}

function extractTranscriptFromCaptions(expectedVideoId: string): string | null {
  if (!isCurrentVideo(expectedVideoId)) return null;

  const selectors = [
    ".ytp-caption-segment",
    ".captions-text",
    ".caption-line-time",
  ];

  for (const selector of selectors) {
    const transcript = capTranscript(
      Array.from(document.querySelectorAll(selector))
        .map((element) => element.textContent?.trim())
        .filter((text): text is string => Boolean(text))
        .join(" "),
    );
    if (transcript.length > MIN_TRANSCRIPT_LENGTH) return transcript;
  }

  return null;
}

function parseXmlTranscript(xmlContent: string): string {
  const xmlDocument = new DOMParser().parseFromString(xmlContent, "text/xml");
  const entries = Array.from(xmlDocument.querySelectorAll("text"))
    .map((node): TranscriptEntry | null => {
      const text = node.textContent?.trim();
      if (!text) return null;
      const parsedStart = Number.parseFloat(node.getAttribute("start") ?? "0");
      return {
        text,
        start:
          Number.isFinite(parsedStart) && parsedStart >= 0 ? parsedStart : 0,
      };
    })
    .filter((entry): entry is TranscriptEntry => entry !== null);

  return formatTranscriptEntries(entries);
}

function formatTranscriptFromEvents(events: TimedTextEvent[]): string {
  const entries = events
    .map((event): TranscriptEntry | null => {
      const text =
        event.segs
          ?.map((segment) => segment.utf8 ?? "")
          .join("")
          .trim() ?? "";
      if (!text) return null;

      const start = (event.tStartMs ?? 0) / 1_000;
      return { text, start: Number.isFinite(start) && start >= 0 ? start : 0 };
    })
    .filter((entry): entry is TranscriptEntry => entry !== null);

  return formatTranscriptEntries(entries);
}

function formatTranscriptEntries(entries: TranscriptEntry[]): string {
  let transcript = "";

  for (const entry of entries) {
    const minutes = Math.floor(entry.start / 60);
    const seconds = Math.floor(entry.start % 60);
    const timestamp = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    const line = `${transcript ? "\n" : ""}[${timestamp}] ${entry.text}`;
    const remainingLength = MAX_TRANSCRIPT_LENGTH - transcript.length;
    if (remainingLength <= 0) break;
    transcript += line.slice(0, remainingLength);
  }

  return capTranscript(transcript);
}

export function isYouTubeVideoPage(): boolean {
  return getYouTubeVideoId(window.location.href) !== null;
}

export async function extractYouTubeTranscript(
  url: string,
): Promise<YouTubeTranscriptResult | null> {
  const expectedVideoId = getYouTubeVideoId(url);
  if (!expectedVideoId || !isCurrentVideo(expectedVideoId)) return null;

  const methods: Array<{
    source: TranscriptSource;
    extract: () => Promise<string | null> | string | null;
  }> = [
    {
      source: "page",
      extract: () => extractTranscriptFromPageData(expectedVideoId),
    },
    {
      source: "api",
      extract: () => extractTranscriptFromAPI(expectedVideoId),
    },
    {
      source: "captions",
      extract: () => extractTranscriptFromCaptions(expectedVideoId),
    },
    {
      source: "xhr-interception",
      extract: () => extractTranscriptFromXHRInterception(expectedVideoId),
    },
  ];

  for (const method of methods) {
    try {
      const transcript = capTranscript((await method.extract()) ?? "");
      if (
        transcript.length > MIN_TRANSCRIPT_LENGTH &&
        isCurrentVideo(expectedVideoId)
      ) {
        return {
          transcript,
          source: method.source,
          videoId: expectedVideoId,
          extractedAt: new Date().toISOString(),
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function waitForYouTubePlayer(timeout = 10_000): Promise<boolean> {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const checkPlayer = () => {
      if (Date.now() - startedAt > timeout) {
        resolve(false);
        return;
      }

      if (
        document.querySelector("#movie_player, .html5-video-player") &&
        document.querySelector("video")
      ) {
        resolve(true);
        return;
      }

      window.setTimeout(checkPlayer, 500);
    };

    checkPlayer();
  });
}
