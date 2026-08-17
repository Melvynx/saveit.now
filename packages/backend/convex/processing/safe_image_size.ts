import { imageSize } from "image-size";

type SafeImageFormat = "jpeg" | "png" | "webp";
type ImageSizeParser = typeof imageSize;

const ALLOWED_CONTENT_TYPES: Record<string, SafeImageFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

function detectSafeImageFormat(buffer: Uint8Array): SafeImageFormat | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

export function parseSafeImageDimensions(
  buffer: Uint8Array,
  declaredContentType: string | null,
  parser: ImageSizeParser = imageSize,
) {
  const detectedFormat = detectSafeImageFormat(buffer);
  if (!detectedFormat) {
    throw new Error(
      "Unsupported image format; only PNG, JPEG, and WebP are allowed",
    );
  }

  const normalizedContentType = declaredContentType
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  const declaredFormat = normalizedContentType
    ? ALLOWED_CONTENT_TYPES[normalizedContentType]
    : undefined;
  if (!declaredFormat) {
    throw new Error(
      "Unsupported image content type; only image/png, image/jpeg, and image/webp are allowed",
    );
  }

  if (declaredFormat !== detectedFormat) {
    throw new Error("Image content type does not match image bytes");
  }

  const dimensions = parser(buffer);
  return {
    ...dimensions,
    contentType:
      detectedFormat === "jpeg" ? "image/jpeg" : `image/${detectedFormat}`,
    extension: detectedFormat === "jpeg" ? "jpg" : detectedFormat,
  };
}
