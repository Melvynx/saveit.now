import { uploadFileToS3 } from "@/lib/aws-s3/aws-s3-upload-files";
import { BookmarkValidationError } from "@/lib/database/bookmark-validation";
import { createBookmark } from "@/lib/database/create-bookmark";
import { apiRoute } from "@/lib/safe-route";
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

export const POST = apiRoute.body(z.any()).handler(async (req, { ctx }) => {
  try {
    const formData = await req.formData();
    const url = formData.get("url") as string;
    const metadataString = formData.get("metadata") as string;
    const imageFile = formData.get("image") as File | null;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required", success: false },
        { status: 400 },
      );
    }

    let metadata: Record<string, unknown> = {};
    if (metadataString) {
      try {
        metadata = JSON.parse(metadataString);
      } catch {
        metadata = {};
      }
    }

    let actualUrl = url;

    if (imageFile) {
      if (imageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File size must be less than 2MB", success: false },
          { status: 400 },
        );
      }

      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          {
            error: "Only image files (JPEG, PNG, WebP, GIF) are allowed",
            success: false,
          },
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
          { error: "Failed to upload image", success: false },
          { status: 500 },
        );
      }

      actualUrl = s3Url;
      metadata.originalFileName = imageFile.name;
      metadata.uploadedFromMobile = true;
    }

    const bookmark = await createBookmark({
      url: actualUrl,
      userId: ctx.user.id,
      metadata,
    });

    return {
      success: true,
      bookmark: {
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        summary: bookmark.summary,
        type: bookmark.type,
        status: bookmark.status,
        starred: bookmark.starred,
        read: bookmark.read,
        createdAt: bookmark.createdAt,
        updatedAt: bookmark.updatedAt,
      },
    };
  } catch (error: unknown) {
    if (error instanceof BookmarkValidationError) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 400 },
      );
    }

    throw error;
  }
});

export const GET = apiRoute
  .query(
    z.object({
      query: z.string().optional(),
      tags: z.string().optional(),
      types: z.string().optional(),
      special: z.enum(["READ", "UNREAD", "STAR"]).optional(),
      limit: z.coerce.number().min(1).max(100).optional().default(20),
      cursor: z.string().optional(),
    }),
  )
  .handler(async (_, { ctx, query }) => {
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

    const result = await cachedAdvancedSearch({
      userId: ctx.user.id,
      query: query.query,
      tags,
      types,
      specialFilters: query.special ? [query.special] : [],
      limit: query.limit,
      cursor: query.cursor,
    });

    return {
      success: true,
      bookmarks: result.bookmarks.map((bookmark) => ({
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        summary: bookmark.summary,
        type: bookmark.type,
        status: bookmark.status,
        starred: bookmark.starred,
        read: bookmark.read,
        preview: bookmark.preview,
        faviconUrl: bookmark.faviconUrl,
        ogImageUrl: bookmark.ogImageUrl,
        ogDescription: bookmark.ogDescription,
        createdAt: bookmark.createdAt,
        metadata: bookmark.metadata,
        matchedTags: bookmark.matchedTags,
        score: bookmark.score,
        matchType: bookmark.matchType,
      })),
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  });
