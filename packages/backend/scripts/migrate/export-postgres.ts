/**
 * export-postgres.ts — Export every relevant Postgres table to JSONL files.
 *
 * Run with:
 *   DATABASE_URL=postgres://... tsx packages/backend/scripts/migrate/export-postgres.ts
 *
 * Output: ./migration-export/<table>.jsonl (one JSON object per line)
 *
 * Tables exported:
 *   user             → user.jsonl
 *   account          → account.jsonl
 *   "Tag"            → tag.jsonl
 *   "Bookmark"       → bookmark.jsonl  (titleEmbedding + vectorSummaryEmbedding EXCLUDED)
 *   "BookmarkTag"    → bookmarkTag.jsonl
 *   "BookmarkOpen"   → bookmarkOpen.jsonl
 *   subscription     → subscription.jsonl
 *   "ChatConversation" → chatConversation.jsonl  (includes messages JSON column)
 *
 * Notes:
 *  - Vector embedding columns are excluded (we re-embed in Convex).
 *  - The `pg` Client streams rows using a cursor to avoid loading millions of rows
 *    into memory at once.
 */

import "./_env"; // loads scripts/migrate/.env (DATABASE_URL) into process.env — keep first
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const OUTPUT_DIR = path.resolve(process.cwd(), "migration-export");

// ---------------------------------------------------------------------------
// Table definitions
// ---------------------------------------------------------------------------

type TableExport = {
  /** JSONL output filename (no extension). */
  file: string;
  /** SQL query — table name must be quoted if mixed-case. */
  query: string;
};

const TABLES: TableExport[] = [
  {
    file: "user",
    query: `SELECT * FROM "user" ORDER BY "createdAt"`,
  },
  {
    file: "account",
    query: `SELECT * FROM "account" ORDER BY "createdAt"`,
  },
  {
    file: "tag",
    // Quoted because the Prisma model is Tag → table "Tag".
    // Tag has no createdAt column — order by id.
    query: `SELECT * FROM "Tag" ORDER BY id`,
  },
  {
    file: "bookmark",
    // Exclude pgvector embedding columns — they are large and not migrated.
    query: `
      SELECT
        id, "userId", url, type, title, summary, note, preview,
        "vectorSummary", "faviconUrl", "ogImageUrl", "ogDescription",
        "imageDescription", metadata, status, starred, read,
        "createdAt", "updatedAt"
      FROM "Bookmark"
      ORDER BY "createdAt"
    `,
  },
  {
    file: "bookmarkTag",
    query: `SELECT * FROM "BookmarkTag"`,
  },
  {
    file: "bookmarkOpen",
    query: `SELECT * FROM "BookmarkOpen" ORDER BY "openedAt"`,
  },
  {
    file: "subscription",
    // Prisma Subscription has no createdAt column — order by id.
    query: `SELECT * FROM "subscription" ORDER BY id`,
  },
  {
    file: "chatConversation",
    // `messages` is a JSON/JSONB column in the old schema containing an array
    // of AI SDK UIMessage objects.
    query: `SELECT * FROM "ChatConversation" ORDER BY "createdAt"`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function exportTable(
  client: Client,
  table: TableExport,
): Promise<number> {
  const filePath = path.join(OUTPUT_DIR, `${table.file}.jsonl`);
  const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

  return new Promise<number>((resolve, reject) => {
    let rowCount = 0;

    // Use a cursor via the simple query protocol so we don't need pg-query-stream.
    // For very large tables you could add FETCH FORWARD <n> in a transaction, but
    // a single SELECT with ORDER BY is fine for typical bookmark datasets.
    client.query(table.query, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      for (const row of result.rows) {
        stream.write(JSON.stringify(row) + "\n");
        rowCount++;
      }

      stream.end(() => resolve(rowCount));
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  ensureOutputDir();
  console.log(`Output directory: ${OUTPUT_DIR}`);

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log("Connected to Postgres.\n");

    const totals: Record<string, number> = {};

    for (const table of TABLES) {
      process.stdout.write(`Exporting ${table.file}... `);
      try {
        const count = await exportTable(client, table);
        totals[table.file] = count;
        console.log(`${count} rows → ${table.file}.jsonl`);
      } catch (err) {
        console.error(`\nFailed to export ${table.file}:`, err);
        // Continue with other tables — a missing table (e.g. if subscription
        // doesn't exist yet) should not abort the whole export.
        totals[table.file] = -1;
      }
    }

    console.log("\n--- Export summary ---");
    for (const [table, count] of Object.entries(totals)) {
      console.log(
        `  ${table}: ${count === -1 ? "ERROR (skipped)" : `${count} rows`}`,
      );
    }

    console.log("\nExport complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
