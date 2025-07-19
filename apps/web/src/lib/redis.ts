import { Redis } from "@upstash/redis";
import { env } from "./env";

if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required for changelog notifications");
}

export const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;