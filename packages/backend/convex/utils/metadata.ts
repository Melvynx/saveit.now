const SENSITIVE_METADATA_KEYS = new Set([
  "transcript",
  "rawhtml",
  "html",
  "sourcehtml",
  "articlehtml",
  "bodyhtml",
  "pagehtml",
  "searchembedding",
  "embedding",
  "vectorsummary",
  "processingerror",
  "note",
  "userid",
  "stripecustomerid",
  "stripesubscriptionid",
  "secret",
  "accesstoken",
  "refreshtoken",
  "password",
]);

const PROTOTYPE_POLLUTION_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

const PUBLIC_METADATA_KEYS = new Set([
  "articleContent",
  "markdown",
  "content",
  "youtubeId",
  "tweetId",
  "pdfUrl",
  "screenshotUrl",
  "width",
  "height",
  "brand",
  "price",
  "currency",
  "description",
  "ogDescription",
  "imageDescription",
  "thumbnailDescription",
  "thumbnailUrl",
  "media",
  "medias",
  "mediaDetails",
  "media_url_https",
  "ext_alt_text",
  "type",
  "url",
  "text",
  "id_str",
  "created_at",
  "favorite_count",
  "conversation_count",
  "reply_count",
  "retweet_count",
  "user",
  "name",
  "screen_name",
  "profile_image_url_https",
]);

const OMIT = Symbol("omitMetadataValue");

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isBlockedKey(key: string): boolean {
  return (
    PROTOTYPE_POLLUTION_KEYS.has(key) ||
    SENSITIVE_METADATA_KEYS.has(key.toLowerCase())
  );
}

function sanitizeMetadataValue(
  value: unknown,
  options: { publicOnly: boolean },
): JsonValue | typeof OMIT {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : OMIT;
  }

  if (Array.isArray(value)) {
    const cleanedArray: JsonValue[] = [];
    for (const item of value) {
      const cleaned = sanitizeMetadataValue(item, options);
      if (cleaned !== OMIT) {
        cleanedArray.push(cleaned);
      }
    }
    return cleanedArray;
  }

  if (!isPlainObject(value)) {
    return OMIT;
  }

  const cleaned: Record<string, JsonValue> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isBlockedKey(key)) {
      continue;
    }

    if (options.publicOnly && !PUBLIC_METADATA_KEYS.has(key)) {
      continue;
    }

    const cleanedValue = sanitizeMetadataValue(nestedValue, options);
    if (cleanedValue !== OMIT) {
      cleaned[key] = cleanedValue;
    }
  }

  return cleaned;
}

function cleanMetadataObject(
  metadata: unknown,
  options: { publicOnly: boolean },
): Record<string, unknown> | null {
  if (metadata === null) {
    return null;
  }

  if (!isPlainObject(metadata)) {
    return null;
  }

  const cleaned = sanitizeMetadataValue(metadata, options);

  return isPlainObject(cleaned) ? cleaned : null;
}

export function cleanMetadata(
  metadata: unknown,
): Record<string, unknown> | null {
  if (metadata === undefined) {
    return undefined as unknown as Record<string, unknown> | null;
  }

  return cleanMetadataObject(metadata, { publicOnly: false });
}

export function cleanPublicMetadata(
  metadata: unknown,
): Record<string, unknown> | null {
  if (metadata === undefined) {
    return undefined as unknown as Record<string, unknown> | null;
  }

  return cleanMetadataObject(metadata, { publicOnly: true });
}
