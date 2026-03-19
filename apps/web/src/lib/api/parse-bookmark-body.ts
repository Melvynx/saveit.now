import { uploadFileToS3 } from "@/lib/aws-s3/aws-s3-upload-files";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

type ParsedBookmarkBody = {
  url: string;
  transcript?: string;
  metadata?: Record<string, unknown>;
};

type ParseResult =
  | { success: true; data: ParsedBookmarkBody }
  | { success: false; error: NextResponse };

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function parseBookmarkBody(
  req: Request,
  userId: string,
): Promise<ParseResult> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    return parseMultipartBody(req, userId);
  }

  return parseJsonBody(req);
}

async function parseJsonBody(req: Request): Promise<ParseResult> {
  const body = await req.json();
  const url = body.url;
  const transcript = body.transcript;
  const metadata = body.metadata;

  if (!url || typeof url !== "string") {
    return {
      success: false,
      error: NextResponse.json(
        { error: "URL is required", success: false },
        { status: 400 },
      ),
    };
  }

  if (!isValidUrl(url)) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Invalid URL format", success: false },
        { status: 400 },
      ),
    };
  }

  return {
    success: true,
    data: { url, transcript, metadata },
  };
}

async function parseMultipartBody(
  req: Request,
  userId: string,
): Promise<ParseResult> {
  const formData = await req.formData();
  let url = formData.get("url") as string;
  const transcript = (formData.get("transcript") as string) || undefined;
  const metadataString = formData.get("metadata") as string;
  const imageFile = formData.get("image") as File | null;

  if (!url) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "URL is required", success: false },
        { status: 400 },
      ),
    };
  }

  let metadata: Record<string, unknown> = {};

  if (metadataString) {
    try {
      metadata = JSON.parse(metadataString);
    } catch {
      metadata = {};
    }
  }

  if (imageFile) {
    if (imageFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: NextResponse.json(
          { error: "File size must be less than 2MB", success: false },
          { status: 400 },
        ),
      };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: "Only image files (JPEG, PNG, WebP, GIF) are allowed",
            success: false,
          },
          { status: 400 },
        ),
      };
    }

    const s3Url = await uploadFileToS3({
      file: imageFile,
      prefix: `users/${userId}/bookmarks`,
      fileName: `${Date.now()}-${imageFile.name}`,
      contentType: imageFile.type,
    });

    if (!s3Url) {
      return {
        success: false,
        error: NextResponse.json(
          { error: "Failed to upload image", success: false },
          { status: 500 },
        ),
      };
    }

    url = s3Url;
    metadata.originalFileName = imageFile.name;
    metadata.uploadedFromMobile = true;
  } else if (!isValidUrl(url)) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Invalid URL format", success: false },
        { status: 400 },
      ),
    };
  }

  return {
    success: true,
    data: { url, transcript, metadata },
  };
}
