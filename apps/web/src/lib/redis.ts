import { Redis } from "@upstash/redis";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.warn("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required for changelog notifications");
}

export const redis = UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

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