import { describe, expect, it, vi } from "vitest";

import { parseSafeImageDimensions } from "./safe_image_size";

const SAFE_IMAGES = [
  {
    name: "PNG",
    contentType: "image/png",
    buffer: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48,
      0x44, 0x52, 0, 0, 0, 2, 0, 0, 0, 3,
    ]),
  },
  {
    name: "JPEG",
    contentType: "image/jpeg",
    buffer: Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xc0, 0, 11, 8, 0, 3, 0, 2, 1, 1,
      0x11, 0,
    ]),
  },
  {
    name: "WebP",
    contentType: "image/webp",
    buffer: Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x16, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
      0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0,
    ]),
  },
] as const;

const DISALLOWED_IMAGES = [
  {
    name: "ICNS",
    contentType: "image/icns",
    buffer: Buffer.from("icns\x00\x00\x00\x08", "binary"),
  },
  {
    name: "HEIF",
    contentType: "image/heif",
    buffer: Buffer.from("\x00\x00\x00\x18ftypheic", "binary"),
  },
  {
    name: "JXL container",
    contentType: "image/jxl",
    buffer: Buffer.from([
      0, 0, 0, 12, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a,
    ]),
  },
  {
    name: "JXL codestream",
    contentType: "image/jxl",
    buffer: Buffer.from([0xff, 0x0a, 0, 0]),
  },
] as const;

describe("parseSafeImageDimensions", () => {
  it.each(SAFE_IMAGES)(
    "keeps normal $name images working",
    ({ buffer, contentType }) => {
      expect(parseSafeImageDimensions(buffer, contentType)).toMatchObject({
        width: 2,
        height: 3,
      });
    },
  );

  it.each(DISALLOWED_IMAGES)(
    "rejects crafted $name bytes before invoking image-size",
    ({ buffer, contentType }) => {
      const parser = vi.fn(() => ({ width: 1, height: 1 }));

      expect(() =>
        parseSafeImageDimensions(buffer, contentType, parser),
      ).toThrow("Unsupported image format");
      expect(parser).not.toHaveBeenCalled();
    },
  );

  it("rejects a declared disallowed media type before invoking image-size", () => {
    const parser = vi.fn(() => ({ width: 1, height: 1 }));

    expect(() =>
      parseSafeImageDimensions(SAFE_IMAGES[0].buffer, "image/heif", parser),
    ).toThrow("Unsupported image content type");
    expect(parser).not.toHaveBeenCalled();
  });

  it("rejects a mismatch between the declared and detected safe formats", () => {
    const parser = vi.fn(() => ({ width: 1, height: 1 }));

    expect(() =>
      parseSafeImageDimensions(SAFE_IMAGES[0].buffer, "image/jpeg", parser),
    ).toThrow("Image content type does not match image bytes");
    expect(parser).not.toHaveBeenCalled();
  });
});
