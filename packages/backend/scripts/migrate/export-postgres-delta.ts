/**
 * export-postgres-delta.ts - Export only Postgres rows changed since a point
 * in time, plus the parent rows needed to resolve foreign keys during import.
 *
 * Run with:
 *   DATABASE_URL=postgres://... pnpm dlx tsx packages/backend/scripts/migrate/export-postgres-delta.ts --since 2026-07-04T09:00:00Z
 *   DATABASE_URL=postgres://... pnpm dlx tsx packages/backend/scripts/migrate/export-postgres-delta.ts --state
 *
 * Output: ./migration-export-delta/<table>.jsonl
 *
 * Timestamped tables are filtered with "createdAt" > since OR "updatedAt" >
 * since when those columns exist. "BookmarkOpen" falls back to "openedAt"
 * because it is an append-only event table in the full export.
 *
 * Timestamp-less relationship tables are exported by linkage:
 *   - "BookmarkTag": rows whose bookmarkId belongs to the delta bookmark set.
 *   - "Tag": rows referenced by those BookmarkTag rows.
 *
 * Tags created without a delta bookmark/tag join cannot be detected from the
 * legacy table because "Tag" has no timestamp. They will be picked up once a
 * changed bookmark references them.
 */

import "./_env"; // loads scripts/migrate/.env (DATABASE_URL) into process.env - keep first
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const OUTPUT_DIR = path.resolve(process.cwd(), "migration-export-delta");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(HERE, ".last-delta-sync");

const BOOKMARK_COLUMNS = `
  id, "userId", url, type, title, summary, note, preview,
  "vectorSummary", "faviconUrl", "ogImageUrl", "ogDescription",
  "imageDescription", metadata, status, starred, read,
  "createdAt", "updatedAt"
`;

type Row = Record<string, unknown>;

type Args = {
  since?: string;
  useState: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { since: process.env.SINCE, useState: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--state") {
      args.useState = true;
      continue;
    }
    if (arg === "--since") {
      const value = argv[index + 1];
      if (!value) throw new Error("--since requires an ISO timestamp");
      args.since = value;
      index += 1;
      continue;
    }
    if (arg?.startsWith("--since=")) {
      args.since = arg.slice("--since=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readStateSince(): string | undefined {
  if (!fs.existsSync(STATE_PATH)) return undefined;
  const value = fs.readFileSync(STATE_PATH, "utf8").trim();
  return value || undefined;
}

function resolveSince(args: Args): {
  sinceIso: string;
  shouldWriteState: boolean;
} {
  const explicitSince = args.since;
  const stateSince = explicitSince ? undefined : readStateSince();
  const since = explicitSince ?? stateSince;
  if (!since) {
    throw new Error(
      `No --since, SINCE, or state file found at ${STATE_PATH}. Pass --since for the first delta export.`,
    );
  }
  const date = new Date(since);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid since timestamp: ${since}`);
  }
  return {
    sinceIso: date.toISOString(),
    shouldWriteState: args.useState || !explicitSince,
  };
}

function ensureFreshOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      fs.unlinkSync(path.join(OUTPUT_DIR, entry.name));
    }
  }
}

function writeJsonl(file: string, rows: Row[]): void {
  const filePath = path.join(OUTPUT_DIR, `${file}.jsonl`);
  const content = rows.map((row) => JSON.stringify(row)).join("\n");
  fs.writeFileSync(filePath, content ? `${content}\n` : "", "utf8");
}

async function getColumns(
  client: Client,
  tableName: string,
): Promise<Set<string>> {
  const result = await client.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

function timestampPredicate(
  columns: Set<string>,
  alias: string,
  fallbackColumn?: string,
): string | null {
  const conditions: string[] = [];
  if (columns.has("createdAt")) conditions.push(`${alias}."createdAt" > $1`);
  if (columns.has("updatedAt")) conditions.push(`${alias}."updatedAt" > $1`);
  if (
    conditions.length === 0 &&
    fallbackColumn &&
    columns.has(fallbackColumn)
  ) {
    conditions.push(`${alias}."${fallbackColumn}" > $1`);
  }
  return conditions.length > 0 ? `(${conditions.join(" OR ")})` : null;
}

function orderByExisting(
  columns: Set<string>,
  alias: string,
  candidates: string[],
  fallback = "id",
): string {
  const column = candidates.find((candidate) => columns.has(candidate));
  return column ? `${alias}."${column}"` : `${alias}.${fallback}`;
}

async function queryRows(
  client: Client,
  label: string,
  query: string,
  params: unknown[],
): Promise<Row[]> {
  try {
    const result = await client.query<Row>(query, params);
    return result.rows;
  } catch (err) {
    console.warn(`[skip] ${label}: ${(err as Error).message}`);
    return [];
  }
}

function addIds(target: Set<string>, rows: Row[], column: string): void {
  for (const row of rows) {
    const value = row[column];
    if (value != null) target.add(String(value));
  }
}

async function selectByIds(
  client: Client,
  label: string,
  tableName: string,
  idColumn: string,
  ids: Set<string>,
  select = "*",
  orderBy?: string,
): Promise<Row[]> {
  if (ids.size === 0) return [];
  const order = orderBy ? ` ORDER BY ${orderBy}` : "";
  return await queryRows(
    client,
    label,
    `
      SELECT ${select}
      FROM ${tableName}
      WHERE ${idColumn}::text = ANY($1::text[])
      ${order}
    `,
    [Array.from(ids)],
  );
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  const exportStartedAt = new Date();
  const args = parseArgs(process.argv.slice(2));
  const { sinceIso, shouldWriteState } = resolveSince(args);

  ensureFreshOutputDir();
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Since:            ${sinceIso}`);
  console.log(`Export started:   ${exportStartedAt.toISOString()}\n`);

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log("Connected to Postgres.\n");

    const columns = {
      user: await getColumns(client, "user"),
      account: await getColumns(client, "account"),
      apiKey: await getColumns(client, "apikey"),
      bookmark: await getColumns(client, "Bookmark"),
      bookmarkOpen: await getColumns(client, "BookmarkOpen"),
      subscription: await getColumns(client, "subscription"),
      chatConversation: await getColumns(client, "ChatConversation"),
    };

    const bookmarkWhere = timestampPredicate(columns.bookmark, "b");
    const bookmarkRows = bookmarkWhere
      ? await queryRows(
          client,
          "bookmark",
          `
            SELECT ${BOOKMARK_COLUMNS}
            FROM "Bookmark" b
            WHERE ${bookmarkWhere}
            ORDER BY ${orderByExisting(columns.bookmark, "b", ["createdAt", "updatedAt"])}
          `,
          [sinceIso],
        )
      : [];

    const bookmarkOpenWhere = timestampPredicate(
      columns.bookmarkOpen,
      "bo",
      "openedAt",
    );
    const bookmarkOpenRows = bookmarkOpenWhere
      ? await queryRows(
          client,
          "bookmarkOpen",
          `
            SELECT *
            FROM "BookmarkOpen" bo
            WHERE ${bookmarkOpenWhere}
            ORDER BY bo."openedAt"
          `,
          [sinceIso],
        )
      : [];

    const bookmarkIds = new Set<string>();
    addIds(bookmarkIds, bookmarkRows, "id");
    addIds(bookmarkIds, bookmarkOpenRows, "bookmarkId");

    const completeBookmarkRows = await selectByIds(
      client,
      "bookmark parents",
      `"Bookmark"`,
      "id",
      bookmarkIds,
      BOOKMARK_COLUMNS,
      `"createdAt"`,
    );

    const bookmarkTagRows =
      bookmarkIds.size === 0
        ? []
        : await queryRows(
            client,
            "bookmarkTag",
            `
              SELECT *
              FROM "BookmarkTag"
              WHERE "bookmarkId"::text = ANY($1::text[])
            `,
            [Array.from(bookmarkIds)],
          );

    const tagIds = new Set<string>();
    addIds(tagIds, bookmarkTagRows, "tagId");
    const tagRows = await selectByIds(
      client,
      "tag",
      `"Tag"`,
      "id",
      tagIds,
      "*",
      "id",
    );

    const accountWhere = timestampPredicate(columns.account, "a");
    const accountRows = accountWhere
      ? await queryRows(
          client,
          "account",
          `SELECT * FROM "account" a WHERE ${accountWhere} ORDER BY ${orderByExisting(columns.account, "a", ["createdAt", "updatedAt"])}`,
          [sinceIso],
        )
      : [];

    const apiKeyWhere = timestampPredicate(columns.apiKey, "ak");
    const apiKeyRows = apiKeyWhere
      ? await queryRows(
          client,
          "apiKey",
          `SELECT * FROM "apikey" ak WHERE ${apiKeyWhere} ORDER BY ak.id`,
          [sinceIso],
        )
      : [];

    const subscriptionWhere = timestampPredicate(columns.subscription, "s");
    const subscriptionRows = subscriptionWhere
      ? await queryRows(
          client,
          "subscription",
          `SELECT * FROM "subscription" s WHERE ${subscriptionWhere} ORDER BY s.id`,
          [sinceIso],
        )
      : [];

    const conversationWhere = timestampPredicate(columns.chatConversation, "c");
    const chatConversationRows = conversationWhere
      ? await queryRows(
          client,
          "chatConversation",
          `
            SELECT *
            FROM "ChatConversation" c
            WHERE ${conversationWhere}
            ORDER BY ${orderByExisting(columns.chatConversation, "c", ["createdAt", "updatedAt"])}
          `,
          [sinceIso],
        )
      : [];

    const userIds = new Set<string>();
    addIds(userIds, completeBookmarkRows, "userId");
    addIds(userIds, bookmarkOpenRows, "userId");
    addIds(userIds, tagRows, "userId");
    addIds(userIds, accountRows, "userId");
    for (const row of apiKeyRows) {
      const value = row.userId ?? row.referenceId;
      if (value != null) userIds.add(String(value));
    }
    for (const row of subscriptionRows) {
      const value = row.userId ?? row.referenceId;
      if (value != null) userIds.add(String(value));
    }
    addIds(userIds, chatConversationRows, "userId");

    const userTimestampWhere = timestampPredicate(columns.user, "u");
    const userRows = await queryRows(
      client,
      "user",
      `
        SELECT *
        FROM "user" u
        WHERE
          ${userTimestampWhere ? `${userTimestampWhere} OR` : ""}
          u.id::text = ANY($2::text[])
        ORDER BY ${orderByExisting(columns.user, "u", ["createdAt", "updatedAt"])}
      `,
      [sinceIso, Array.from(userIds)],
    );

    const files: Array<[string, Row[]]> = [
      ["user", userRows],
      ["account", accountRows],
      ["apiKey", apiKeyRows],
      ["tag", tagRows],
      ["bookmark", completeBookmarkRows],
      ["bookmarkTag", bookmarkTagRows],
      ["bookmarkOpen", bookmarkOpenRows],
      ["subscription", subscriptionRows],
      ["chatConversation", chatConversationRows],
    ];

    for (const [file, rows] of files) {
      writeJsonl(file, rows);
      console.log(`${file}: ${rows.length} rows -> ${file}.jsonl`);
    }

    if (shouldWriteState) {
      fs.writeFileSync(
        STATE_PATH,
        `${exportStartedAt.toISOString()}\n`,
        "utf8",
      );
      console.log(`\nState updated: ${STATE_PATH}`);
    } else {
      console.log(
        "\nState not updated. Pass --state to write .last-delta-sync.",
      );
    }

    console.log("\nDelta export complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
