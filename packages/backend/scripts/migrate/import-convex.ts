/**
 * import-convex.ts — Import JSONL files produced by export-postgres.ts into
 * the live Convex deployment.
 *
 * Run with:
 *   CONVEX_URL=https://your-deployment.convex.cloud \
 *   tsx packages/backend/scripts/migrate/import-convex.ts
 *
 * Prerequisites:
 *   1. Set ALLOW_MIGRATION=true in the Convex environment for the target deployment.
 *   2. Run export-postgres.ts first to generate ./migration-export/*.jsonl
 *   3. After this script completes, call startReembed (see README.md).
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const EXPORT_DIR = path.resolve(process.cwd(), "migration-export");
const CHUNK_SIZE = 100; // rows per mutation call (safe for Convex write limits)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonl(filename: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(EXPORT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`  [skip] ${filename} not found — skipping.`);
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

async function runChunked<T>(
  label: string,
  rows: T[],
  fn: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  const batches = chunk(rows, CHUNK_SIZE);
  let processed = 0;
  for (const batch of batches) {
    await fn(batch);
    processed += batch.length;
    process.stdout.write(
      `\r  ${label}: ${processed}/${rows.length} rows imported`,
    );
  }
  if (rows.length > 0) console.log(); // newline after progress
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    console.error("ERROR: CONVEX_URL is not set.");
    process.exit(1);
  }

  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`ERROR: Export directory not found: ${EXPORT_DIR}`);
    console.error("Run export-postgres.ts first.");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);
  console.log(`Importing into: ${convexUrl}`);
  console.log(`Export dir:     ${EXPORT_DIR}\n`);

  // -------------------------------------------------------------------------
  // 1. Read raw JSONL data
  // -------------------------------------------------------------------------
  console.log("Reading export files...");
  const [rawUsers, rawAccounts, rawTags, rawBookmarks, rawBookmarkTags,
    rawBookmarkOpens, rawSubscriptions, rawConversations] = await Promise.all([
    readJsonl("user.jsonl"),
    readJsonl("account.jsonl"),
    readJsonl("tag.jsonl"),
    readJsonl("bookmark.jsonl"),
    readJsonl("bookmarkTag.jsonl"),
    readJsonl("bookmarkOpen.jsonl"),
    readJsonl("subscription.jsonl"),
    readJsonl("chatConversation.jsonl"),
  ]);
  console.log(`  users: ${rawUsers.length}`);
  console.log(`  accounts: ${rawAccounts.length}`);
  console.log(`  tags: ${rawTags.length}`);
  console.log(`  bookmarks: ${rawBookmarks.length}`);
  console.log(`  bookmarkTags: ${rawBookmarkTags.length}`);
  console.log(`  bookmarkOpens: ${rawBookmarkOpens.length}`);
  console.log(`  subscriptions: ${rawSubscriptions.length}`);
  console.log(`  chatConversations: ${rawConversations.length}\n`);

  // -------------------------------------------------------------------------
  // 2. Attach accounts to their users (embed in user objects)
  // -------------------------------------------------------------------------
  const accountsByUserId = new Map<string, unknown[]>();
  for (const acc of rawAccounts as Record<string, unknown>[]) {
    const uid = String(acc.userId);
    if (!accountsByUserId.has(uid)) accountsByUserId.set(uid, []);
    accountsByUserId.get(uid)!.push(acc);
  }
  const usersWithAccounts = (rawUsers as Record<string, unknown>[]).map((u) => ({
    ...u,
    _accounts: accountsByUserId.get(String(u.id)) ?? [],
  }));

  // -------------------------------------------------------------------------
  // 3. Import users — build legacyId → convexId map
  // -------------------------------------------------------------------------
  console.log("Importing users...");
  const userMap = new Map<string, string>(); // legacyId → convexId
  const userBatches = chunk(usersWithAccounts, CHUNK_SIZE);
  let usersProcessed = 0;
  for (const batch of userBatches) {
    const result = await client.mutation(api.migration.import.importUsers, {
      users: batch,
    });
    for (const { legacyId, convexId } of result) {
      userMap.set(legacyId, convexId);
    }
    usersProcessed += batch.length;
    process.stdout.write(`\r  users: ${usersProcessed}/${rawUsers.length} imported`);
  }
  console.log(`\n  Built user map: ${userMap.size} entries.`);

  // -------------------------------------------------------------------------
  // 4. Import tags — build legacyId → convexId map
  // -------------------------------------------------------------------------
  console.log("\nImporting tags...");
  const tagMap = new Map<string, string>(); // legacyId → convexId
  const tagsRewritten = (rawTags as Record<string, unknown>[]).map((t) => ({
    ...t,
    userId: userMap.get(String(t.userId)) ?? t.userId,
  }));
  const tagBatches = chunk(tagsRewritten, CHUNK_SIZE);
  let tagsProcessed = 0;
  for (const batch of tagBatches) {
    const result = await client.mutation(api.migration.import.importTags, {
      tags: batch,
    });
    for (const { legacyId, convexId } of result) {
      tagMap.set(legacyId, convexId);
    }
    tagsProcessed += batch.length;
    process.stdout.write(`\r  tags: ${tagsProcessed}/${rawTags.length} imported`);
  }
  console.log(`\n  Built tag map: ${tagMap.size} entries.`);

  // -------------------------------------------------------------------------
  // 5. Import bookmarks — build legacyId → convexId map
  // -------------------------------------------------------------------------
  console.log("\nImporting bookmarks...");
  const bookmarkMap = new Map<string, string>(); // legacyId → convexId
  const bookmarksRewritten = (rawBookmarks as Record<string, unknown>[]).map((b) => ({
    ...b,
    userId: userMap.get(String(b.userId)) ?? b.userId,
  }));
  const bookmarkBatches = chunk(bookmarksRewritten, CHUNK_SIZE);
  let bookmarksProcessed = 0;
  for (const batch of bookmarkBatches) {
    const result = await client.mutation(api.migration.import.importBookmarks, {
      bookmarks: batch,
    });
    for (const { legacyId, convexId } of result) {
      bookmarkMap.set(legacyId, convexId);
    }
    bookmarksProcessed += batch.length;
    process.stdout.write(`\r  bookmarks: ${bookmarksProcessed}/${rawBookmarks.length} imported`);
  }
  console.log(`\n  Built bookmark map: ${bookmarkMap.size} entries.`);

  // -------------------------------------------------------------------------
  // 6. Import bookmarkTags
  // -------------------------------------------------------------------------
  console.log("\nImporting bookmarkTags...");
  const bookmarkTagsRewritten = (rawBookmarkTags as Record<string, unknown>[])
    .map((row) => {
      const bookmarkId = bookmarkMap.get(String(row.bookmarkId));
      const tagId = tagMap.get(String(row.tagId));
      const userId = userMap.get(String(row.userId)) ?? row.userId;
      if (!bookmarkId || !tagId) return null; // dangling FK — skip
      return { bookmarkId, tagId, userId };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await runChunked("bookmarkTags", bookmarkTagsRewritten, (batch) =>
    client.mutation(api.migration.import.importBookmarkTags, { rows: batch }),
  );

  // -------------------------------------------------------------------------
  // 7. Import bookmarkOpens
  // -------------------------------------------------------------------------
  console.log("Importing bookmarkOpens...");
  const bookmarkOpensRewritten = (rawBookmarkOpens as Record<string, unknown>[])
    .map((row) => {
      const bookmarkId = bookmarkMap.get(String(row.bookmarkId));
      const userId = userMap.get(String(row.userId)) ?? row.userId;
      if (!bookmarkId) return null;
      return { ...row, bookmarkId, userId };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await runChunked("bookmarkOpens", bookmarkOpensRewritten, (batch) =>
    client.mutation(api.migration.import.importBookmarkOpens, { rows: batch }),
  );

  // -------------------------------------------------------------------------
  // 8. Import subscriptions
  // -------------------------------------------------------------------------
  console.log("Importing subscriptions...");
  const subscriptionsRewritten = (rawSubscriptions as Record<string, unknown>[]).map(
    (row) => ({
      ...row,
      userId:
        userMap.get(String(row.userId ?? row.referenceId)) ??
        row.userId ??
        row.referenceId,
    }),
  );

  await runChunked("subscriptions", subscriptionsRewritten, (batch) =>
    client.mutation(api.migration.import.importSubscriptions, { rows: batch }),
  );

  // -------------------------------------------------------------------------
  // 9. Import chatConversations (+ embedded messages)
  // -------------------------------------------------------------------------
  console.log("Importing chatConversations...");
  const conversationsRewritten = (rawConversations as Record<string, unknown>[]).map(
    (row) => ({
      ...row,
      userId: userMap.get(String(row.userId)) ?? row.userId,
      // Postgres stores messages as a JSON column (`messages`). Re-key to `_messages`
      // so the import mutation finds it consistently regardless of schema variants.
      _messages: row.messages ?? row._messages ?? [],
    }),
  );

  await runChunked("conversations", conversationsRewritten, (batch) =>
    client.mutation(api.migration.import.importConversations, { rows: batch }),
  );

  // -------------------------------------------------------------------------
  // 10. Rebuild userCounters
  // -------------------------------------------------------------------------
  console.log("\nRebuilding userCounters...");
  const allConvexUserIds = Array.from(userMap.values());
  const userIdBatches = chunk(allConvexUserIds, CHUNK_SIZE);
  let countersProcessed = 0;
  for (const batch of userIdBatches) {
    await client.mutation(api.migration.import.rebuildUserCounters, {
      userIds: batch,
    });
    countersProcessed += batch.length;
    process.stdout.write(
      `\r  userCounters: ${countersProcessed}/${allConvexUserIds.length} users`,
    );
  }
  console.log();

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n--- Import summary ---");
  console.log(`  Users imported:         ${userMap.size}`);
  console.log(`  Tags imported:          ${tagMap.size}`);
  console.log(`  Bookmarks imported:     ${bookmarkMap.size}`);
  console.log(`  BookmarkTags imported:  ${bookmarkTagsRewritten.length}`);
  console.log(`  BookmarkOpens imported: ${bookmarkOpensRewritten.length}`);
  console.log(`  Subscriptions imported: ${subscriptionsRewritten.length}`);
  console.log(`  Conversations imported: ${conversationsRewritten.length}`);
  console.log(`  UserCounters rebuilt:   ${allConvexUserIds.length}`);

  console.log(`
Next step: trigger re-embedding by running:
  npx convex run migration/reembed_helpers:startReembed
OR call:
  client.mutation(api.migration.reembed_helpers.startReembed, {})
Then verify counts and set ALLOW_MIGRATION back to "false".
`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
