import { redis } from "@/lib/redis";

export async function markChangelogAsDismissed(userId: string, version: string): Promise<void> {
  if (!redis) {
    console.warn("Redis not configured, changelog dismissal not saved");
    return;
  }
  await redis.set(`user:${userId}:dismissed_changelog:${version}`, "true");
}

export async function isChangelogDismissed(userId: string, version: string): Promise<boolean> {
  if (!redis) {
    console.warn("Redis not configured, treating changelog as not dismissed");
    return false;
  }
  const result = await redis.get(`user:${userId}:dismissed_changelog:${version}`);
  return result === "true";
}