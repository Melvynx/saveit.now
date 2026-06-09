/**
 * Client-safe bookmark/tag enums — replaces the Prisma-generated enums from
 * `@workspace/database`. Mirrors the Convex schema unions. Usable as both a
 * value (e.g. `BookmarkType.YOUTUBE`) and a type (`BookmarkType`).
 */
export const BookmarkType = {
  VIDEO: "VIDEO",
  ARTICLE: "ARTICLE",
  PAGE: "PAGE",
  IMAGE: "IMAGE",
  YOUTUBE: "YOUTUBE",
  TWEET: "TWEET",
  PDF: "PDF",
  PRODUCT: "PRODUCT",
} as const;
export type BookmarkType = (typeof BookmarkType)[keyof typeof BookmarkType];

export const BookmarkStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  READY: "READY",
  ERROR: "ERROR",
} as const;
export type BookmarkStatus = (typeof BookmarkStatus)[keyof typeof BookmarkStatus];

export const TagType = {
  USER: "USER",
  IA: "IA",
} as const;
export type TagType = (typeof TagType)[keyof typeof TagType];
