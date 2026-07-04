const SENSITIVE_METADATA_KEYS = new Set([
  "transcript",
  "rawtranscript",
  "rawhtml",
  "html",
  "sourcehtml",
  "articlehtml",
  "bodyhtml",
  "pagehtml",
  "articlecontent",
  "markdown",
  "content",
  "rawcontent",
  "fullcontent",
  "plaintext",
  "text",
  "body",
  "bodytext",
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

const STORAGE_PAYLOAD_KEYS = new Set([
  "arraybuffer",
  "base64",
  "blob",
  "buffer",
  "bytes",
  "dataurl",
  "file",
  "filedata",
  "htmlcontent",
  "imagedata",
  "mediadata",
  "raw",
  "screenshotdata",
  "screenshotdataurl",
]);

const PROTOTYPE_POLLUTION_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

const MAX_STORED_METADATA_STRING_LENGTH = 4096;
const MAX_STORED_METADATA_ARRAY_ITEMS = 100;
const MAX_STORED_METADATA_OBJECT_KEYS = 100;

const PUBLIC_METADATA_KEYS = new Set([
  "youtubeId",
  "youtubeTranscript",
  "transcriptAvailable",
  "transcriptSource",
  "transcriptCharacterCount",
  "transcriptExtractedAt",
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
  const normalizedKey = key.toLowerCase();
  return (
    PROTOTYPE_POLLUTION_KEYS.has(key) ||
    SENSITIVE_METADATA_KEYS.has(normalizedKey) ||
    STORAGE_PAYLOAD_KEYS.has(normalizedKey) ||
    normalizedKey.includes("base64") ||
    normalizedKey.includes("dataurl") ||
    normalizedKey.includes("arraybuffer")
  );
}

function sanitizeMetadataValue(
  value: unknown,
  options: { publicOnly: boolean; forStorage: boolean },
): JsonValue | typeof OMIT {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    if (options.forStorage) {
      const trimmed = value.trim();
      if (
        trimmed.length > MAX_STORED_METADATA_STRING_LENGTH ||
        /^data:/i.test(trimmed)
      ) {
        return OMIT;
      }
    }
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : OMIT;
  }

  if (Array.isArray(value)) {
    const cleanedArray: JsonValue[] = [];
    const items = options.forStorage
      ? value.slice(0, MAX_STORED_METADATA_ARRAY_ITEMS)
      : value;
    for (const item of items) {
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
  const entries = options.forStorage
    ? Object.entries(value).slice(0, MAX_STORED_METADATA_OBJECT_KEYS)
    : Object.entries(value);
  for (const [key, nestedValue] of entries) {
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
  options: { publicOnly: boolean; forStorage: boolean },
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

  return cleanMetadataObject(metadata, { publicOnly: false, forStorage: false });
}

export function cleanPublicMetadata(
  metadata: unknown,
): Record<string, unknown> | null {
  if (metadata === undefined) {
    return undefined as unknown as Record<string, unknown> | null;
  }

  return cleanMetadataObject(metadata, { publicOnly: true, forStorage: false });
}

export function cleanMetadataForStorage(
  metadata: unknown,
): Record<string, unknown> | null {
  if (metadata === undefined) {
    return undefined as unknown as Record<string, unknown> | null;
  }

  return cleanMetadataObject(metadata, { publicOnly: false, forStorage: true });
}
