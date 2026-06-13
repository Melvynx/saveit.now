/**
 * import-convex.ts — Import JSONL files produced by export-postgres.ts into
 * the live Convex deployment.
 *
 * Run with:
 *   CONVEX_URL=https://your-deployment.convex.cloud \
 *   tsx packages/backend/scripts/migrate/import-convex.ts
 *
 * Prerequisites:
 *   1. Set ALLOW_MIGRATION=true and MIGRATION_SECRET in the Convex environment.
 *   2. Set the same MIGRATION_SECRET in this shell.
 *   3. Run export-postgres.ts first to generate ./migration-export/*.jsonl
 *   4. After this script completes, call startReembed (see README.md).
 */

import "./_env"; // loads scripts/migrate/.env (CONVEX_URL, MIGRATION_SECRET) — keep first
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
// Conversations embed their full message JSON, so 100/batch can exceed the
// Convex HTTP request-body limit. Send them one at a time.
const CONVERSATION_CHUNK_SIZE = Number(
  process.env.CONVERSATION_CHUNK_SIZE ?? "1",
);
// Optional: run only specific stages (comma-separated), e.g.
// ONLY_STAGES=conversations,counters. The `users` stage always runs because
// every later stage needs the legacyId→convexId user map it builds.
const ONLY_STAGES = (process.env.ONLY_STAGES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const shouldRun = (stage: string) =>
  ONLY_STAGES.length === 0 || ONLY_STAGES.includes(stage);
const migrationSecret = process.env.MIGRATION_SECRET;

if (!migrationSecret) {
  throw new Error("MIGRATION_SECRET must be set before importing into Convex");
}

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

/** Retry a Convex call on transient network errors (EPIPE / fetch failed / ECONNRESET). */
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
        `\n  [retry ${i + 1}/${attempts}] ${msg} — waiting ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
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
  const [
    rawUsers,
    rawAccounts,
    rawTags,
    rawBookmarks,
    rawBookmarkTags,
    rawBookmarkOpens,
    rawSubscriptions,
    rawConversations,
  ] = await Promise.all([
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
  const usersWithAccounts = (rawUsers as Record<string, unknown>[]).map(
    (u) => ({
      ...u,
      _accounts: accountsByUserId.get(String(u.id)) ?? [],
    }),
  );

  // -------------------------------------------------------------------------
  // 3. Import users — build legacyId → convexId map
  // -------------------------------------------------------------------------
  // Summary counters — set by each stage that runs (stages can be skipped via
  // ONLY_STAGES, so these stay 0 for skipped stages).
  let bookmarkTagsCount = 0;
  let bookmarkOpensCount = 0;
  let subscriptionsCount = 0;
  let conversationsCount = 0;
  let countersCount = 0;

  console.log("Importing users...");
  const userMap = new Map<string, string>(); // legacyId → convexId
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

  // -------------------------------------------------------------------------
  // 4. Import tags — build legacyId → convexId map
  // -------------------------------------------------------------------------
  const tagMap = new Map<string, string>(); // legacyId → convexId
  if (shouldRun("tags")) {
    console.log("\nImporting tags...");
    const tagsRewritten = (rawTags as Record<string, unknown>[]).map((t) => ({
      ...t,
      userId: userMap.get(String(t.userId)) ?? t.userId,
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

  // -------------------------------------------------------------------------
  // 5. Import bookmarks — build legacyId → convexId map
  // -------------------------------------------------------------------------
  const bookmarkMap = new Map<string, string>(); // legacyId → convexId
  if (shouldRun("bookmarks")) {
    console.log("\nImporting bookmarks...");
    const bookmarksRewritten = (rawBookmarks as Record<string, unknown>[]).map(
      (b) => ({
        ...b,
        userId: userMap.get(String(b.userId)) ?? b.userId,
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
      for (const { legacyId, convexId } of result) {
        bookmarkMap.set(legacyId, convexId);
      }
      bookmarksProcessed += batch.length;
      process.stdout.write(
        `\r  bookmarks: ${bookmarksProcessed}/${rawBookmarks.length} imported`,
      );
    }
    console.log(`\n  Built bookmark map: ${bookmarkMap.size} entries.`);
  }

  // -------------------------------------------------------------------------
  // 6. Import bookmarkTags
  // -------------------------------------------------------------------------
  if (shouldRun("bookmarkTags")) {
    console.log("\nImporting bookmarkTags...");
    // Legacy BookmarkTag rows have no userId column - derive it from the bookmark's owner.
    const bookmarkLegacyUser = new Map<string, string>(); // legacy bookmarkId → legacy userId
    for (const b of rawBookmarks as Record<string, unknown>[]) {
      bookmarkLegacyUser.set(String(b.id), String(b.userId));
    }
    const bookmarkTagsRewritten = (rawBookmarkTags as Record<string, unknown>[])
      .map((row) => {
        const bookmarkId = bookmarkMap.get(String(row.bookmarkId));
        const tagId = tagMap.get(String(row.tagId));
        const legacyUserId = bookmarkLegacyUser.get(String(row.bookmarkId));
        const userId = legacyUserId ? userMap.get(legacyUserId) : undefined;
        if (!bookmarkId || !tagId || !userId) return null; // dangling FK — skip
        return { bookmarkId, tagId, userId };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
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

  // -------------------------------------------------------------------------
  // 7. Import bookmarkOpens
  // -------------------------------------------------------------------------
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
      .filter((r): r is NonNullable<typeof r> => r !== null);

    bookmarkOpensCount = bookmarkOpensRewritten.length;
    await runChunked("bookmarkOpens", bookmarkOpensRewritten, (batch) =>
      client.mutation(api.migration.import.importBookmarkOpens, {
        rows: batch,
        migrationSecret,
      }),
    );
  }

  // -------------------------------------------------------------------------
  // 8. Import subscriptions
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // 9. Import chatConversations (+ embedded messages)
  // -------------------------------------------------------------------------
  if (shouldRun("conversations")) {
    console.log("Importing chatConversations...");
    const conversationsRewritten = (
      rawConversations as Record<string, unknown>[]
    ).map((row) => ({
      ...row,
      userId: userMap.get(String(row.userId)) ?? row.userId,
      // Postgres stores messages as a JSON column (`messages`). Re-key to `_messages`
      // so the import mutation finds it consistently regardless of schema variants.
      _messages: row.messages ?? row._messages ?? [],
    }));

    conversationsCount = conversationsRewritten.length;
    // Conversations embed their full message JSON, so a single one can be large.
    // Send them in small batches to stay under the Convex request-body limit.
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

  // -------------------------------------------------------------------------
  // 10. Rebuild userCounters
  // -------------------------------------------------------------------------
  if (shouldRun("counters")) {
    console.log("\nRebuilding userCounters...");
    // Count bookmarks per user from the export data (avoids reading every
    // bookmark doc inside a mutation, which blows Convex read limits).
    const countByConvexUser = new Map<string, number>();
    for (const b of rawBookmarks as Record<string, unknown>[]) {
      const convexUserId = userMap.get(String(b.userId));
      if (!convexUserId) continue;
      countByConvexUser.set(
        convexUserId,
        (countByConvexUser.get(convexUserId) ?? 0) + 1,
      );
    }
    // Every imported user gets a counter row, even with 0 bookmarks.
    const counterEntries = Array.from(userMap.values()).map((userId) => ({
      userId,
      bookmarkCount: countByConvexUser.get(userId) ?? 0,
    }));
    countersCount = counterEntries.length;
    await runChunked("userCounters", counterEntries, (batch) =>
      client.mutation(api.migration.import.rebuildUserCounters, {
        counters: batch,
        migrationSecret,
      }),
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n--- Import summary ---");
  console.log(`  Users imported:         ${userMap.size}`);
  console.log(`  Tags imported:          ${tagMap.size}`);
  console.log(`  Bookmarks imported:     ${bookmarkMap.size}`);
  console.log(`  BookmarkTags imported:  ${bookmarkTagsCount}`);
  console.log(`  BookmarkOpens imported: ${bookmarkOpensCount}`);
  console.log(`  Subscriptions imported: ${subscriptionsCount}`);
  console.log(`  Conversations imported: ${conversationsCount}`);
  console.log(`  UserCounters rebuilt:   ${countersCount}`);

  console.log(`
Next step: trigger re-embedding by running:
  npx convex run migration/reembed_helpers:startReembed '{"migrationSecret":"'$MIGRATION_SECRET'"}'
OR call:
  client.mutation(api.migration.reembed_helpers.startReembed, { migrationSecret })
Then verify counts and set ALLOW_MIGRATION back to "false".
`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
