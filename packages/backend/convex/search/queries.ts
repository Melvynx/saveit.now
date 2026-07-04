/**
 * search/queries.ts — Internal Convex queries for the search module.
 *
 * Default (Convex V8 edge) runtime — NO "use node" directive.
 * All functions are internalQuery; they are called from search/actions.ts.
 */

import { v } from "convex/values";
import { internalQuery } from "../functions";
import { bookmarkType } from "../schema";
import { Doc, Id } from "../_generated/dataModel";
import {
  applyOpenFrequencyBoost,
  bookmarkToSearchResult,
  cleanMetadata,
  extractDomain,
  matchesSpecialFilters,
  type SearchResultDTO,
} from "./helpers";

// ---------------------------------------------------------------------------
// Helpers used inside queries
// ---------------------------------------------------------------------------

/**
 * Loads the tag names for a set of bookmarkTags join rows.
 * Returns an array of { tag: { id, name, type } } objects.
 */
async function loadTagsForBookmark(
  ctx: any,
  bookmarkId: string,
): Promise<Array<{ tag: { id: string; name: string; type: string } }>> {
  const joinRows = await ctx.db
    .query("bookmarkTags")
    .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", bookmarkId))
    .collect();

  const tags: Array<{ tag: { id: string; name: string; type: string } }> = [];
  for (const row of joinRows) {
    const tag = await ctx.db.get(row.tagId);
    if (tag) {
      tags.push({
        tag: {
          id: tag._id as string,
          name: tag.name,
          type: tag.type,
        },
      });
    }
  }
  return tags;
}

// ---------------------------------------------------------------------------
// searchByDomain
// ---------------------------------------------------------------------------

export const searchByDomain = internalQuery({
  args: {
    userId: v.string(),
    domain: v.string(),
    types: v.optional(v.array(bookmarkType)),
    specialFilters: v.optional(
      v.array(
        v.union(v.literal("READ"), v.literal("UNREAD"), v.literal("STAR")),
      ),
    ),
  },
  handler: async (ctx, args): Promise<SearchResultDTO[]> => {
    const { userId, domain, types, specialFilters } = args;

    // Load all READY bookmarks for this user via by_user_status index
    // then filter by domain in action code (Convex has no ILIKE).
    // We bound the scan to READY status — domain search is a search-mode operation.
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_status", (q: any) =>
        q.eq("userId", userId).eq("status", "READY"),
      )
      .collect();

    const results: SearchResultDTO[] = [];

    for (const row of rows) {
      // Type filter
      if (types && types.length > 0 && !types.includes(row.type as any)) {
        continue;
      }

      // Special filter (READ / UNREAD / STAR)
      if (!matchesSpecialFilters(row, specialFilters)) continue;

      // Domain match
      const bookmarkDomain = extractDomain(row.url);
      const isMatch =
        bookmarkDomain.includes(domain) || domain.includes(bookmarkDomain);
      if (!isMatch) continue;

      const isExactMatch = bookmarkDomain === domain;
      const baseScore = isExactMatch ? 150 : 120;

      // Open count for boost
      const openRows = await ctx.db
        .query("bookmarkOpens")
        .withIndex("by_bookmark_user", (q: any) =>
          q.eq("bookmarkId", row._id).eq("userId", userId),
        )
        .collect();
      const openCount = openRows.length;

      const score = applyOpenFrequencyBoost(baseScore, openCount);

      const tags = await loadTagsForBookmark(ctx, row._id as string);

      results.push(
        bookmarkToSearchResult(
          {
            _id: row._id as string,
            userId: row.userId,
            url: row.url,
            title: row.title,
            summary: row.summary,
            preview: row.preview,
            type: row.type ?? null,
            status: row.status,
            ogImageUrl: row.ogImageUrl,
            ogDescription: row.ogDescription,
            faviconUrl: row.faviconUrl,
            createdAt: row.createdAt,
            metadata: cleanMetadata(row.metadata),
            starred: row.starred,
            read: row.read,
            tags,
          },
          score,
          "combined",
          [domain],
          openCount,
        ),
      );
    }

    // Sort by score desc, id desc
    results.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.id.localeCompare(a.id);
    });

    return results;
  },
});

// ---------------------------------------------------------------------------
// searchByTags
// ---------------------------------------------------------------------------

export const searchByTags = internalQuery({
  args: {
    userId: v.string(),
    tags: v.array(v.string()),
    types: v.optional(v.array(bookmarkType)),
    specialFilters: v.optional(
      v.array(
        v.union(v.literal("READ"), v.literal("UNREAD"), v.literal("STAR")),
      ),
    ),
  },
  handler: async (ctx, args): Promise<SearchResultDTO[]> => {
    const { userId, tags, types, specialFilters } = args;

    if (tags.length === 0) return [];

    // 1. Resolve tag names to tag IDs for this user
    const tagIdMap = new Map<string, string>(); // tagName -> tagId
    for (const tagName of tags) {
      const tagDoc = await ctx.db
        .query("tags")
        .withIndex("by_user_name", (q: any) =>
          q.eq("userId", userId).eq("name", tagName),
        )
        .first();
      if (tagDoc) {
        tagIdMap.set(tagName, tagDoc._id as string);
      }
    }

    if (tagIdMap.size === 0) return [];

    // 2. For each resolved tag, collect bookmark IDs via by_user_tag index
    const bookmarkTagCounts = new Map<
      Id<"bookmarks">,
      { count: number; matchedTagNames: string[] }
    >();

    for (const [tagName, tagId] of tagIdMap.entries()) {
      const joinRows = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_user_tag", (q: any) =>
          q.eq("userId", userId).eq("tagId", tagId),
        )
        .collect();

      for (const row of joinRows) {
        const bmId: Id<"bookmarks"> = row.bookmarkId;
        const existing = bookmarkTagCounts.get(bmId);
        if (existing) {
          existing.count += 1;
          existing.matchedTagNames.push(tagName);
        } else {
          bookmarkTagCounts.set(bmId, { count: 1, matchedTagNames: [tagName] });
        }
      }
    }

    if (bookmarkTagCounts.size === 0) return [];

    // 3. Load bookmarks and build results
    const results: SearchResultDTO[] = [];

    for (const [
      bmId,
      { count, matchedTagNames },
    ] of bookmarkTagCounts.entries()) {
      const row: Doc<"bookmarks"> | null = await ctx.db.get(bmId);
      if (!row) continue;

      // Ownership check (defense in depth)
      if (row.userId !== userId) continue;

      // Status filter — tag search is a search-mode operation
      if (row.status !== "READY") continue;

      // Type filter
      if (types && types.length > 0 && !types.includes(row.type as any)) {
        continue;
      }

      // Special filter
      if (!matchesSpecialFilters(row, specialFilters)) continue;

      const tagMatchRatio = count / tags.length;
      const baseScore = tagMatchRatio * 100 * 1.5;

      // Open count
      const openRows = await ctx.db
        .query("bookmarkOpens")
        .withIndex("by_bookmark_user", (q: any) =>
          q.eq("bookmarkId", bmId).eq("userId", userId),
        )
        .collect();
      const openCount = openRows.length;

      const score = applyOpenFrequencyBoost(baseScore, openCount);

      const allTags = await loadTagsForBookmark(ctx, bmId);

      results.push(
        bookmarkToSearchResult(
          {
            _id: bmId,
            userId: row.userId,
            url: row.url,
            title: row.title,
            summary: row.summary,
            preview: row.preview,
            type: row.type ?? null,
            status: row.status,
            ogImageUrl: row.ogImageUrl,
            ogDescription: row.ogDescription,
            faviconUrl: row.faviconUrl,
            createdAt: row.createdAt,
            metadata: cleanMetadata(row.metadata),
            starred: row.starred,
            read: row.read,
            tags: allTags,
          },
          score,
          "tag",
          matchedTagNames,
          openCount,
        ),
      );
    }

    // Sort by score desc, id desc
    results.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.id.localeCompare(a.id);
    });

    return results;
  },
});

// ---------------------------------------------------------------------------
// loadForSearch
// ---------------------------------------------------------------------------

/**
 * Loads a set of bookmarks by their IDs and re-checks ownership (defense in
 * depth, per Contract §E.12).  Returns the docs with their tags joined.
 */
export const loadForSearch = internalQuery({
  args: {
    ids: v.array(v.id("bookmarks")),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { ids, userId } = args;

    const results: Array<{
      _id: string;
      userId: string;
      url: string;
      title?: string | null;
      summary?: string | null;
      preview?: string | null;
      type?: string | null;
      status: string;
      ogImageUrl?: string | null;
      ogDescription?: string | null;
      faviconUrl?: string | null;
      createdAt: number;
      metadata?: any;
      starred: boolean;
      read: boolean;
      note?: string | null;
      vectorSummary?: string | null;
      updatedAt: number;
      processingStep?: number | null;
      processingError?: string | null;
      embeddingModel?: string | null;
      tags: Array<{ tag: { id: string; name: string; type: string } }>;
    }> = [];

    for (const id of ids) {
      const row = await ctx.db.get(id);
      if (!row) continue;

      // Re-check ownership (defense in depth — E.12)
      if (row.userId !== userId) continue;

      const tags = await loadTagsForBookmark(ctx, row._id as string);

      results.push({
        _id: row._id as string,
        userId: row.userId,
        url: row.url,
        title: row.title ?? null,
        summary: row.summary ?? null,
        preview: row.preview ?? null,
        type: row.type ?? null,
        status: row.status,
        ogImageUrl: row.ogImageUrl ?? null,
        ogDescription: row.ogDescription ?? null,
        faviconUrl: row.faviconUrl ?? null,
        createdAt: row.createdAt,
        metadata: row.metadata,
        starred: row.starred,
        read: row.read,
        note: row.note ?? null,
        vectorSummary: row.vectorSummary ?? null,
        updatedAt: row.updatedAt,
        processingStep: row.processingStep ?? null,
        processingError: row.processingError ?? null,
        embeddingModel: row.embeddingModel ?? null,
        tags,
      });
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// listForBoost — open counts for a set of bookmarks
// ---------------------------------------------------------------------------

/**
 * Returns a map of bookmarkId -> openCount for the given bookmarkIds.
 * Returns an array of { bookmarkId, openCount } pairs.
 */
export const listForBoost = internalQuery({
  args: {
    bookmarkIds: v.array(v.id("bookmarks")),
    userId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Array<{ bookmarkId: string; openCount: number }>> => {
    const { bookmarkIds, userId } = args;

    const result: Array<{ bookmarkId: string; openCount: number }> = [];

    for (const bookmarkId of bookmarkIds) {
      const openRows = await ctx.db
        .query("bookmarkOpens")
        .withIndex("by_bookmark_user", (q: any) =>
          q.eq("bookmarkId", bookmarkId).eq("userId", userId),
        )
        .collect();

      result.push({
        bookmarkId: bookmarkId as string,
        openCount: openRows.length,
      });
    }

    return result;
  },
});
