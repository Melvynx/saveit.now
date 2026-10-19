/**
 * Return validators for bookmark DTOs (mirror of the types in ./dto.ts).
 */

import { v } from "convex/values";
import { bookmarkStatus, bookmarkType } from "../schema";

export const tagInBookmarkValidator = v.object({
  tag: v.object({
    id: v.string(),
    name: v.string(),
    type: v.string(),
  }),
});

export const bookmarkDTOFields = {
  _id: v.id("bookmarks"),
  id: v.string(),
  legacyId: v.optional(v.union(v.string(), v.null())),
  url: v.string(),
  title: v.union(v.string(), v.null()),
  summary: v.union(v.string(), v.null()),
  preview: v.union(v.string(), v.null()),
  type: v.union(bookmarkType, v.null()),
  status: bookmarkStatus,
  ogImageUrl: v.union(v.string(), v.null()),
  ogDescription: v.union(v.string(), v.null()),
  faviconUrl: v.union(v.string(), v.null()),
  score: v.number(),
  matchType: v.union(
    v.literal("tag"),
    v.literal("vector"),
    v.literal("combined"),
    v.literal("text"),
    v.literal("default"),
  ),
  matchedTags: v.array(v.string()),
  tags: v.array(tagInBookmarkValidator),
  createdAt: v.number(),
  metadata: v.any(),
  openCount: v.number(),
  starred: v.boolean(),
  read: v.boolean(),
  processingError: v.union(v.string(), v.null()),
  processingStep: v.union(v.number(), v.null()),
};

export const bookmarkDTOValidator = v.object(bookmarkDTOFields);

export const tagDTOValidator = v.object({
  _id: v.id("tags"),
  id: v.string(),
  name: v.string(),
  type: v.union(v.literal("USER"), v.literal("IA")),
});
