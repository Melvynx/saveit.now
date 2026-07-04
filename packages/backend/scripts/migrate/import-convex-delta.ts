/**
 * import-convex-delta.ts - Import a Postgres delta export into Convex prod.
 *
 * Runbook, from packages/backend:
 *
 *   npx convex env set ALLOW_MIGRATION true --prod
 *
 *   DATABASE_URL=... pnpm dlx tsx scripts/migrate/export-postgres-delta.ts --since 2026-07-04T09:00:00Z
 *   # Or rely on scripts/migrate/.last-delta-sync after the first stateful run:
 *   DATABASE_URL=... pnpm dlx tsx scripts/migrate/export-postgres-delta.ts --state
 *
 *   CONVEX_URL=https://charming-spider-722.convex.cloud MIGRATION_SECRET=... pnpm dlx tsx scripts/migrate/import-convex-delta.ts
 *
 *   npx convex env set ALLOW_MIGRATION false --prod
 *
 * This importer is safe to rerun. Existing users are resolved by the idempotent
 * importUsers mutation (email dedupe), existing tags by (userId, name), and
 * existing bookmarks by legacyId then (userId, url). The delta exporter includes
 * the parent rows needed for these lookups because legacy user and tag IDs were
 * not stored in Convex during the original full import.
 */

import "./_env"; // loads scripts/migrate/.env (CONVEX_URL, MIGRATION_SECRET) - keep first
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const EXPORT_DIR = path.resolve(process.cwd(), "migration-export-delta");
const CHUNK_SIZE = 100;
const CONVERSATION_CHUNK_SIZE = Number(
  process.env.CONVERSATION_CHUNK_SIZE ?? "1",
);
const REEMBED_CHUNK_SIZE = Number(process.env.REEMBED_CHUNK_SIZE ?? "25");
const ONLY_STAGES = (process.env.ONLY_STAGES ?? "")
  .split(",")
  .map((stage) => stage.trim())
  .filter(Boolean);
const shouldRun = (stage: string) =>
  ONLY_STAGES.length === 0 || ONLY_STAGES.includes(stage);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set before importing into Convex`);
  }
  return value;
}

const migrationSecret = requireEnv("MIGRATION_SECRET");

function readJsonl(filename: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(EXPORT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`  [skip] ${filename} not found - skipping.`);
      resolve([]);
      return;
    }

    const rows: unknown[] = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed) rows.push(JSON.parse(trimmed));
    });
    rl.on("close", () => resolve(rows));
    rl.on("error", reject);
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String((err as Error)?.message ?? err);
      const transient =
        /EPIPE|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|network/i.test(
          msg,
        );
      if (!transient || i === attempts - 1) throw err;
      const delay = 1000 * 2 ** i;
      console.warn(
        `\n  [retry ${i + 1}/${attempts}] ${msg} - waiting ${delay}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

async function runChunked<T>(
  label: string,
  rows: T[],
  fn: (batch: T[]) => Promise<unknown>,
  chunkSize: number = CHUNK_SIZE,
): Promise<void> {
  const batches = chunk(rows, chunkSize);
  let processed = 0;
  for (const batch of batches) {
    await withRetry(() => fn(batch));
    processed += batch.length;
    process.stdout.write(
      `\r  ${label}: ${processed}/${rows.length} rows imported`,
    );
  }
  if (rows.length > 0) console.log();
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function main(): Promise<void> {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    console.error("ERROR: CONVEX_URL is not set.");
    process.exit(1);
  }

  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`ERROR: Export directory not found: ${EXPORT_DIR}`);
    console.error("Run export-postgres-delta.ts first.");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);
  console.log(`Importing delta into: ${convexUrl}`);
  console.log(`Export dir:           ${EXPORT_DIR}\n`);

  console.log("Reading delta export files...");
  const [
    rawUsers,
    rawAccounts,
    rawApiKeys,
    rawTags,
    rawBookmarks,
    rawBookmarkTags,
    rawBookmarkOpens,
    rawSubscriptions,
    rawConversations,
  ] = await Promise.all([
    readJsonl("user.jsonl"),
    readJsonl("account.jsonl"),
    readJsonl("apiKey.jsonl"),
    readJsonl("tag.jsonl"),
    readJsonl("bookmark.jsonl"),
    readJsonl("bookmarkTag.jsonl"),
    readJsonl("bookmarkOpen.jsonl"),
    readJsonl("subscription.jsonl"),
    readJsonl("chatConversation.jsonl"),
  ]);
  console.log(`  users: ${rawUsers.length}`);
  console.log(`  accounts: ${rawAccounts.length}`);
  console.log(`  apiKeys: ${rawApiKeys.length}`);
  console.log(`  tags: ${rawTags.length}`);
  console.log(`  bookmarks: ${rawBookmarks.length}`);
  console.log(`  bookmarkTags: ${rawBookmarkTags.length}`);
  console.log(`  bookmarkOpens: ${rawBookmarkOpens.length}`);
  console.log(`  subscriptions: ${rawSubscriptions.length}`);
  console.log(`  chatConversations: ${rawConversations.length}\n`);

  const accountsByUserId = new Map<string, unknown[]>();
  for (const acc of rawAccounts as Record<string, unknown>[]) {
    const uid = String(acc.userId);
    if (!accountsByUserId.has(uid)) accountsByUserId.set(uid, []);
    accountsByUserId.get(uid)!.push(acc);
  }
  const usersWithAccounts = (rawUsers as Record<string, unknown>[]).map(
    (user) => ({
      ...user,
      _accounts: accountsByUserId.get(String(user.id)) ?? [],
    }),
  );

  let apiKeysCount = 0;
  let bookmarkTagsCount = 0;
  let bookmarkOpensCount = 0;
  let subscriptionsCount = 0;
  let conversationsCount = 0;

  console.log("Importing users...");
  const userMap = new Map<string, string>();
  const userBatches = chunk(usersWithAccounts, CHUNK_SIZE);
  let usersProcessed = 0;
  for (const batch of userBatches) {
    const result = await withRetry(() =>
      client.mutation(api.migration.import.importUsers, {
        users: batch,
        migrationSecret,
      }),
    );
    for (const { legacyId, convexId } of result) {
      userMap.set(legacyId, convexId);
    }
    usersProcessed += batch.length;
    process.stdout.write(
      `\r  users: ${usersProcessed}/${rawUsers.length} imported`,
    );
  }
  console.log(`\n  Built user map: ${userMap.size} entries.`);

  if (shouldRun("apiKeys")) {
    console.log("\nImporting apiKeys...");
    const apiKeysRewritten = (rawApiKeys as Record<string, unknown>[])
      .map((row) => {
        const legacyUserId = String(row.userId ?? row.referenceId ?? "");
        const referenceId = userMap.get(legacyUserId);
        if (!referenceId) return null;
        return { ...row, referenceId, userId: referenceId };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    console.log(
      `  apiKeys resolved: ${apiKeysRewritten.length}/${rawApiKeys.length}`,
    );
    apiKeysCount = apiKeysRewritten.length;
    await runChunked("apiKeys", apiKeysRewritten, (batch) =>
      client.mutation(api.migration.import.importApiKeys, {
        rows: batch,
        migrationSecret,
      }),
    );
  }

  const tagMap = new Map<string, string>();
  if (shouldRun("tags")) {
    console.log("\nImporting tags...");
    const tagsRewritten = (rawTags as Record<string, unknown>[]).map((tag) => ({
      ...tag,
      userId: userMap.get(String(tag.userId)) ?? tag.userId,
    }));

    const tagBatches = chunk(tagsRewritten, CHUNK_SIZE);
    let tagsProcessed = 0;
    for (const batch of tagBatches) {
      const result = await withRetry(() =>
        client.mutation(api.migration.import.importTags, {
          tags: batch,
          migrationSecret,
        }),
      );
      for (const { legacyId, convexId } of result) {
        tagMap.set(legacyId, convexId);
      }
      tagsProcessed += batch.length;
      process.stdout.write(
        `\r  tags: ${tagsProcessed}/${rawTags.length} imported`,
      );
    }
    console.log(`\n  Built tag map: ${tagMap.size} entries.`);
  }

  const bookmarkMap = new Map<string, string>();
  const newlyCreatedBookmarkIds: Id<"bookmarks">[] = [];
  const newBookmarkCountByUser = new Map<string, number>();
  if (shouldRun("bookmarks")) {
    console.log("\nImporting bookmarks...");
    const bookmarksRewritten = (rawBookmarks as Record<string, unknown>[]).map(
      (bookmark) => ({
        ...bookmark,
        userId: userMap.get(String(bookmark.userId)) ?? bookmark.userId,
      }),
    );

    const bookmarkBatches = chunk(bookmarksRewritten, CHUNK_SIZE);
    let bookmarksProcessed = 0;
    for (const batch of bookmarkBatches) {
      const result = await withRetry(() =>
        client.mutation(api.migration.import.importBookmarks, {
          bookmarks: batch,
          migrationSecret,
        }),
      );
      for (const { legacyId, convexId, created } of result) {
        bookmarkMap.set(legacyId, convexId);
        if (created) {
          newlyCreatedBookmarkIds.push(convexId as Id<"bookmarks">);
          const source = batch.find(
            (row) => String((row as Record<string, unknown>).id) === legacyId,
          ) as Record<string, unknown> | undefined;
          if (source?.userId != null)
            increment(newBookmarkCountByUser, String(source.userId));
        }
      }
      bookmarksProcessed += batch.length;
      process.stdout.write(
        `\r  bookmarks: ${bookmarksProcessed}/${rawBookmarks.length} imported`,
      );
    }
    console.log(`\n  Built bookmark map: ${bookmarkMap.size} entries.`);
  }

  if (shouldRun("bookmarkTags")) {
    console.log("\nImporting bookmarkTags...");
    const bookmarkLegacyUser = new Map<string, string>();
    for (const bookmark of rawBookmarks as Record<string, unknown>[]) {
      bookmarkLegacyUser.set(String(bookmark.id), String(bookmark.userId));
    }
    const bookmarkTagsRewritten = (rawBookmarkTags as Record<string, unknown>[])
      .map((row) => {
        const bookmarkId = bookmarkMap.get(String(row.bookmarkId));
        const tagId = tagMap.get(String(row.tagId));
        const legacyUserId = bookmarkLegacyUser.get(String(row.bookmarkId));
        const userId = legacyUserId ? userMap.get(legacyUserId) : undefined;
        if (!bookmarkId || !tagId || !userId) return null;
        return { bookmarkId, tagId, userId };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    console.log(
      `  bookmarkTags resolved: ${bookmarkTagsRewritten.length}/${rawBookmarkTags.length}`,
    );
    bookmarkTagsCount = bookmarkTagsRewritten.length;
    await runChunked("bookmarkTags", bookmarkTagsRewritten, (batch) =>
      client.mutation(api.migration.import.importBookmarkTags, {
        rows: batch,
        migrationSecret,
      }),
    );
  }

  if (shouldRun("bookmarkOpens")) {
    console.log("Importing bookmarkOpens...");
    const bookmarkOpensRewritten = (
      rawBookmarkOpens as Record<string, unknown>[]
    )
      .map((row) => {
        const bookmarkId = bookmarkMap.get(String(row.bookmarkId));
        const userId = userMap.get(String(row.userId)) ?? row.userId;
        if (!bookmarkId) return null;
        return { ...row, bookmarkId, userId };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    bookmarkOpensCount = bookmarkOpensRewritten.length;
    await runChunked("bookmarkOpens", bookmarkOpensRewritten, (batch) =>
      client.mutation(api.migration.import.importBookmarkOpens, {
        rows: batch,
        migrationSecret,
      }),
    );
  }

  if (shouldRun("subscriptions")) {
    console.log("Importing subscriptions...");
    const subscriptionsRewritten = (
      rawSubscriptions as Record<string, unknown>[]
    ).map((row) => ({
      ...row,
      userId:
        userMap.get(String(row.userId ?? row.referenceId)) ??
        row.userId ??
        row.referenceId,
    }));

    subscriptionsCount = subscriptionsRewritten.length;
    await runChunked("subscriptions", subscriptionsRewritten, (batch) =>
      client.mutation(api.migration.import.importSubscriptions, {
        rows: batch,
        migrationSecret,
      }),
    );
  }

  if (shouldRun("conversations")) {
    console.log("Importing chatConversations...");
    const conversationsRewritten = (
      rawConversations as Record<string, unknown>[]
    ).map((row) => ({
      ...row,
      userId: userMap.get(String(row.userId)) ?? row.userId,
      _messages: row.messages ?? row._messages ?? [],
    }));

    conversationsCount = conversationsRewritten.length;
    await runChunked(
      "conversations",
      conversationsRewritten,
      (batch) =>
        client.mutation(api.migration.import.importConversations, {
          rows: batch,
          migrationSecret,
        }),
      CONVERSATION_CHUNK_SIZE,
    );
  }

  let embedded = 0;
  let skippedEmbedding = 0;
  let failedEmbedding = 0;
  if (shouldRun("reembed") && newlyCreatedBookmarkIds.length > 0) {
    console.log("\nTargeted re-embedding newly created bookmarks...");
    const batches = chunk(newlyCreatedBookmarkIds, REEMBED_CHUNK_SIZE);
    let processed = 0;
    for (const batch of batches) {
      const result = await withRetry(() =>
        client.action(api.migration.reembed.reembedBookmarks, {
          bookmarkIds: batch,
          migrationSecret,
        }),
      );
      embedded += result.embedded;
      skippedEmbedding += result.skipped;
      failedEmbedding += result.failed;
      processed += batch.length;
      process.stdout.write(
        `\r  reembed: ${processed}/${newlyCreatedBookmarkIds.length} bookmark ids processed`,
      );
    }
    console.log();
  }

  console.log("\n--- Delta import summary ---");
  console.log(`  Users resolved/imported:      ${userMap.size}`);
  console.log(`  API keys imported:            ${apiKeysCount}`);
  console.log(`  Tags resolved/imported:       ${tagMap.size}`);
  console.log(`  Bookmarks resolved/imported:  ${bookmarkMap.size}`);
  console.log(
    `  Newly created bookmarks:      ${newlyCreatedBookmarkIds.length}`,
  );
  console.log(`  BookmarkTags imported:        ${bookmarkTagsCount}`);
  console.log(`  BookmarkOpens imported:       ${bookmarkOpensCount}`);
  console.log(`  Subscriptions imported:       ${subscriptionsCount}`);
  console.log(`  Conversations imported:       ${conversationsCount}`);
  console.log(
    `  Counter increments:           ${newlyCreatedBookmarkIds.length}`,
  );
  for (const [userId, count] of newBookmarkCountByUser) {
    console.log(`    ${userId}: +${count}`);
  }
  console.log(
    `  Targeted embedding:           embedded=${embedded} skipped=${skippedEmbedding} failed=${failedEmbedding}`,
  );

  console.log("\nNewly created Convex bookmark IDs:");
  if (newlyCreatedBookmarkIds.length === 0) {
    console.log("  (none)");
  } else {
    for (const id of newlyCreatedBookmarkIds) {
      console.log(`  ${id}`);
    }
  }

  console.log('\nSet ALLOW_MIGRATION back to "false" after verification.');
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
