/**
 * tags/manualUsage.ts — shared helpers for tags the user adds by hand.
 *
 * Every manual add (bookmark tag editor, library bulk pill, browser extension)
 * bumps `tags.manualUseCount`, so the quick-tag row can offer the handful of
 * tags a person actually reaches for. AI tagging never goes through here.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { TagDTO } from "../bookmarks/dto";
import { throwValidationError } from "../utils/errors";

export const MAX_TAG_NAME_LENGTH = 48;
export const MAX_TAG_CHANGES = 20;
export const DEFAULT_SUGGESTION_LIMIT = 5;
const MAX_SUGGESTION_LIMIT = 10;
const FALLBACK_SCAN = 60;
const SEARCH_SCAN = 500;

export type SuggestedTagDTO = TagDTO & { manualUseCount: number };

export function toTagDTO(tag: Doc<"tags">): TagDTO {
  return { _id: tag._id, id: tag._id, name: tag.name, type: tag.type };
}

/** Trim, drop empties and duplicates, and enforce length and count bounds. */
export function normalizeTagNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name || seen.has(name.toLowerCase())) continue;
    if (name.length > MAX_TAG_NAME_LENGTH) {
      throwValidationError(
        `Tag names must be ${MAX_TAG_NAME_LENGTH} characters or fewer`,
      );
    }
    seen.add(name.toLowerCase());
    result.push(name);
  }
  if (result.length > MAX_TAG_CHANGES) {
    throwValidationError(`At most ${MAX_TAG_CHANGES} tags per change`);
  }
  return result;
}

async function findTagByName(
  ctx: QueryCtx,
  userId: string,
  name: string,
): Promise<Doc<"tags"> | null> {
  return await ctx.db
    .query("tags")
    .withIndex("by_user_name", (q) => q.eq("userId", userId).eq("name", name))
    .first();
}

async function findOrCreateUserTag(
  ctx: MutationCtx,
  userId: string,
  name: string,
): Promise<Doc<"tags">> {
  const existing = await findTagByName(ctx, userId, name);
  if (existing) return existing;
  const tagId = await ctx.db.insert("tags", { userId, name, type: "USER" });
  const created = await ctx.db.get(tagId);
  if (!created) throw new Error("Tag insert failed");
  return created;
}

export async function recordManualTagUse(
  ctx: MutationCtx,
  tag: Doc<"tags">,
  now = Date.now(),
): Promise<void> {
  await ctx.db.patch(tag._id, {
    manualUseCount: (tag.manualUseCount ?? 0) + 1,
    lastManualUseAt: now,
  });
}

export async function listBookmarkTags(
  ctx: QueryCtx,
  bookmarkId: Id<"bookmarks">,
): Promise<TagDTO[]> {
  const rows = await ctx.db
    .query("bookmarkTags")
    .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
    .take(200);
  const tags: TagDTO[] = [];
  for (const row of rows) {
    const tag = await ctx.db.get(row.tagId);
    if (tag) tags.push(toTagDTO(tag));
  }
  return tags;
}

/**
 * Add and remove tags on one bookmark by name. Added tags count as manual
 * uses; tags already on the bookmark are left alone and not counted again.
 */
export async function applyManualTagChanges(
  ctx: MutationCtx,
  userId: string,
  bookmarkId: Id<"bookmarks">,
  changes: { add: string[]; remove: string[] },
): Promise<TagDTO[]> {
  const add = normalizeTagNames(changes.add);
  const remove = normalizeTagNames(changes.remove).filter(
    (name) => !add.some((added) => added.toLowerCase() === name.toLowerCase()),
  );

  const rows = await ctx.db
    .query("bookmarkTags")
    .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
    .take(200);
  const joinedTagIds = new Set<string>(rows.map((row) => row.tagId));

  const now = Date.now();
  for (const name of add) {
    const tag = await findOrCreateUserTag(ctx, userId, name);
    if (joinedTagIds.has(tag._id)) continue;
    await ctx.db.insert("bookmarkTags", { bookmarkId, tagId: tag._id, userId });
    joinedTagIds.add(tag._id);
    await recordManualTagUse(ctx, tag, now);
  }

  for (const name of remove) {
    const tag = await findTagByName(ctx, userId, name);
    if (!tag) continue;
    for (const row of rows) {
      if (row.tagId === tag._id) await ctx.db.delete(row._id);
    }
  }

  return await listBookmarkTags(ctx, bookmarkId);
}

/**
 * The tags the user adds by hand most often. When there is not enough manual
 * history yet, the row is topped up with the user's own most recent tags so a
 * new account still gets useful buttons.
 */
export async function getTopManualTags(
  ctx: QueryCtx,
  userId: string,
  requestedLimit = DEFAULT_SUGGESTION_LIMIT,
): Promise<SuggestedTagDTO[]> {
  const limit = Math.max(
    1,
    Math.min(Math.floor(requestedLimit), MAX_SUGGESTION_LIMIT),
  );

  const ranked = await ctx.db
    .query("tags")
    .withIndex("by_user_manual_use_count", (q) => q.eq("userId", userId))
    .order("desc")
    .take(limit);

  const result: SuggestedTagDTO[] = ranked
    .filter((tag) => (tag.manualUseCount ?? 0) > 0)
    .map((tag) => ({ ...toTagDTO(tag), manualUseCount: tag.manualUseCount ?? 0 }));

  if (result.length >= limit) return result;

  const picked = new Set<string>(result.map((tag) => tag.id));
  const recent = await ctx.db
    .query("tags")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .take(FALLBACK_SCAN);
  const fallback = [
    ...recent.filter((tag) => tag.type === "USER"),
    ...recent.filter((tag) => tag.type !== "USER"),
  ];
  for (const tag of fallback) {
    if (result.length >= limit) break;
    if (picked.has(tag._id)) continue;
    picked.add(tag._id);
    result.push({ ...toTagDTO(tag), manualUseCount: tag.manualUseCount ?? 0 });
  }
  return result;
}

/** Case-insensitive search over the user's tags; prefix matches rank first. */
export async function searchUserTags(
  ctx: QueryCtx,
  userId: string,
  query: string,
  limit = 8,
): Promise<TagDTO[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const tags = await ctx.db
    .query("tags")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(SEARCH_SCAN);
  return tags
    .filter((tag) => tag.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(needle) ? 0 : 1;
      const bPrefix = b.name.toLowerCase().startsWith(needle) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      const usage = (b.manualUseCount ?? 0) - (a.manualUseCount ?? 0);
      return usage !== 0 ? usage : a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map(toTagDTO);
}
