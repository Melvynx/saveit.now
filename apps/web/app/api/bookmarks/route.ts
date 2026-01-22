import { uploadFileToS3 } from "@/lib/aws-s3/aws-s3-upload-files";
import { BookmarkValidationError } from "@/lib/database/bookmark-validation";
import { createBookmark } from "@/lib/database/create-bookmark";
import { userRoute } from "@/lib/safe-route";
import { cachedAdvancedSearch } from "@/lib/search/cached-search";
import { BookmarkType } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const POST = userRoute.body(z.any()).handler(async (req, { ctx }) => {
  try {
    const contentType = req.headers.get("content-type") || "";
    let url: string;
    let transcript: string | undefined;
    let metadata: unknown;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      url = formData.get("url") as string;
      transcript = (formData.get("transcript") as string) || undefined;
      const metadataString = formData.get("metadata") as string;
      const imageFile = formData.get("image") as File | null;

      if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }

      if (metadataString) {
        try {
          metadata = JSON.parse(metadataString);
        } catch {
          metadata = {};
        }
      }

      if (imageFile) {
        if (imageFile.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: "File size must be less than 2MB" },
            { status: 400 },
          );
        }

        if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
          return NextResponse.json(
            { error: "Only image files (JPEG, PNG, WebP, GIF) are allowed" },
            { status: 400 },
          );
        }

        const s3Url = await uploadFileToS3({
          file: imageFile,
          prefix: `users/${ctx.user.id}/bookmarks`,
          fileName: `${Date.now()}-${imageFile.name}`,
          contentType: imageFile.type,
        });

        if (!s3Url) {
          return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 },
          );
        }

        url = s3Url;
        metadata = {
          ...(metadata as Record<string, unknown>),
          originalFileName: imageFile.name,
          uploadedFromMobile: true,
        };
      }
    } else {
      const body = await req.json();
      url = body.url;
      transcript = body.transcript;
      metadata = body.metadata;

      if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }
    }

    const bookmark = await createBookmark({
      url,
      userId: ctx.user.id,
      transcript,
      metadata: metadata as Record<string, any> | undefined,
    });

    return { status: "ok", bookmark };
  } catch (error: unknown) {
    if (error instanceof BookmarkValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
});

export const GET = userRoute
  .query(
    z.object({
      query: z.string().optional(),
      tags: z.string().optional(),
      types: z.string().optional(),
      special: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(50).optional(),
      matchingDistance: z.coerce.number().min(0.1).max(2).optional(),
    }),
  )
  .handler(async (req, { ctx, query }) => {
    // Validate and filter bookmark types
    const validBookmarkTypes = Object.values(BookmarkType);
    const types = query.types
      ? query.types
          .split(",")
          .filter(Boolean)
          .filter((type): type is BookmarkType =>
            validBookmarkTypes.includes(type as BookmarkType),
          )
      : [];

    const tags = query.tags ? query.tags.split(",").filter(Boolean) : [];

    // Validate and filter special filters
    const validSpecialFilters = ["READ", "UNREAD", "STAR"];

    const specialFilters = query.special
      ? query.special
          .split(",")
          .filter(Boolean)
          .filter((filter): filter is "READ" | "UNREAD" | "STAR" =>
            validSpecialFilters.includes(filter),
          )
      : [];

    const searchResults = await cachedAdvancedSearch({
      userId: ctx.user.id,
      query: query.query,
      tags,
      types,
      specialFilters,
      limit: query.limit || 20,
      cursor: query.cursor,
      matchingDistance: query.matchingDistance || 0.1,
    });

    return searchResults;
  });
