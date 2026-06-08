export type { Bookmark, Prisma, Subscription } from "../generated/prisma";

export const TagType = {
  USER: "USER",
  IA: "IA",
} as const;
export type TagType = (typeof TagType)[keyof typeof TagType];

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
export type BookmarkStatus =
  (typeof BookmarkStatus)[keyof typeof BookmarkStatus];

export const BookmarkProcessingRunStatus = {
  STARTED: "STARTED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type BookmarkProcessingRunStatus =
  (typeof BookmarkProcessingRunStatus)[keyof typeof BookmarkProcessingRunStatus];
