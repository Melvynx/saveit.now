import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from "@ai-sdk/google";

const DEFAULT_APIYI_BASE_URL = "https://api.apiyi.com/v1beta";
const DIRECT_GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export const directGeminiProvider = createGoogleGenerativeAI({});

export function createApiyiGeminiProvider(): GoogleGenerativeAIProvider | null {
  const apiKey = process.env.APIYI_API_KEY;
  if (!apiKey) return null;

  const baseURL = process.env.APIYI_BASE_URL ?? DEFAULT_APIYI_BASE_URL;

  return createGoogleGenerativeAI({
    baseURL,
    apiKey,
    fetch: createApiyiFallbackFetch(baseURL),
  });
}

export async function withGeminiFallback<T>(
  run: (google: GoogleGenerativeAIProvider) => Promise<T>,
): Promise<T> {
  const apiyiProvider = createApiyiGeminiProvider();
  if (!apiyiProvider) {
    return run(directGeminiProvider);
  }

  try {
    return await run(apiyiProvider);
  } catch (error) {
    console.warn(
      `[gemini_provider] apiyi Gemini call failed: ${getErrorMessage(error)}; falling back to direct Gemini`,
    );
    return run(directGeminiProvider);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

function createApiyiFallbackFetch(baseURL: string): typeof fetch {
  return (async (input: FetchInput, init?: FetchInit) => {
    const canReplayBody = !isReadableStreamBody(getRequestBody(input, init));
    let response: Response | null = null;
    let fetchError: unknown = null;

    try {
      response = await globalThis.fetch(input, init);
    } catch (error) {
      fetchError = error;
    }

    if (response?.ok) {
      return response;
    }

    const directApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!directApiKey || !canReplayBody) {
      if (response) return response;
      throw fetchError;
    }

    const directUrl = getDirectGeminiUrl(getRequestUrl(input), baseURL);
    if (!directUrl) {
      if (response) return response;
      throw fetchError;
    }

    console.warn(
      `[gemini_provider] apiyi Gemini fetch failed: ${
        response
          ? `${response.status} ${response.statusText}`
          : getErrorMessage(fetchError)
      }; falling back to direct Gemini`,
    );

    return globalThis.fetch(
      directUrl,
      getReplayInit(input, init, directApiKey),
    );
  }) as typeof fetch;
}

function getRequestUrl(input: FetchInput): string {
  if (input instanceof Request) return input.url;
  return input.toString();
}

function getRequestBody(
  input: FetchInput,
  init: FetchInit | undefined,
): BodyInit | null | undefined {
  if (init && "body" in init) return init.body;
  if (input instanceof Request) return input.body;
  return null;
}

function isReadableStreamBody(
  body: BodyInit | null | undefined,
): body is ReadableStream<Uint8Array> {
  return (
    typeof ReadableStream !== "undefined" && body instanceof ReadableStream
  );
}

function getDirectGeminiUrl(url: string, apiyiBaseUrl: string): string | null {
  const normalizedApiyiBaseUrl = stripTrailingSlash(apiyiBaseUrl);
  if (!url.startsWith(normalizedApiyiBaseUrl)) return null;

  return url.replace(
    normalizedApiyiBaseUrl,
    stripTrailingSlash(DIRECT_GEMINI_BASE_URL),
  );
}

function getReplayInit(
  input: FetchInput,
  init: FetchInit | undefined,
  directApiKey: string,
): FetchInit {
  const headers = new Headers(
    input instanceof Request ? input.headers : undefined,
  );
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }
  headers.set("x-goog-api-key", directApiKey);

  return {
    ...getRequestInit(input),
    ...init,
    headers,
    body: getRequestBody(input, init),
  };
}

function getRequestInit(input: FetchInput): RequestInit {
  if (!(input instanceof Request)) return {};

  return {
    method: input.method,
    headers: input.headers,
    body: input.body,
    cache: input.cache,
    credentials: input.credentials,
    integrity: input.integrity,
    keepalive: input.keepalive,
    mode: input.mode,
    redirect: input.redirect,
    referrer: input.referrer,
    referrerPolicy: input.referrerPolicy,
    signal: input.signal,
  };
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
