import "./_env";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

type ReembedReason = "missingEmbedding" | "invalidDimensions" | "staleModel";

type InspectArgs = {
  migrationSecret: string;
  cursor?: string | null;
  limit?: number;
};

type InspectResult = {
  currentModel: string;
  currentDimensions: number;
  scanned: number;
  needsEmbedding: number;
  continueCursor: string | null;
  isDone: boolean;
  sample: Array<{
    id: string;
    title: string | null;
    reason: ReembedReason;
  }>;
};

type StartArgs = {
  migrationSecret: string;
  batchSize?: number;
};

const inspectReembedBacklog = makeFunctionReference<
  "query",
  InspectArgs,
  InspectResult
>("migration/reembed_helpers:inspectReembedBacklog");

const startReembed = makeFunctionReference<"mutation", StartArgs, null>(
  "migration/reembed_helpers:startReembed",
);

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function readNumberFlag(name: string): number | undefined {
  const value = readFlag(name);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }
  return parsed;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

async function main() {
  const convexUrl = requiredEnv("CONVEX_URL");
  const migrationSecret = requiredEnv("MIGRATION_SECRET");
  const client = new ConvexHttpClient(convexUrl);

  if (hasFlag("--start")) {
    const batchSize = readNumberFlag("--batch-size");
    await client.mutation(startReembed, {
      migrationSecret,
      ...(batchSize === undefined ? {} : { batchSize }),
    });
    console.log(
      JSON.stringify(
        {
          scheduled: true,
          batchSize: batchSize ?? 20,
          note: "Watch Convex logs for [reembed] batch complete entries.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await client.query(inspectReembedBacklog, {
    migrationSecret,
    cursor: readFlag("--cursor") ?? null,
    limit: readNumberFlag("--limit"),
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
