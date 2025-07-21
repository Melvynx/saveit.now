import { redis } from "@/lib/redis";

export async function markChangelogAsDismissed(
  userId: string,
  version: string,
): Promise<void> {
  await redis.set(`user:${userId}:dismissed_changelog:${version}`, "true");
}

export async function isChangelogDismissed(
  userId: string,
  version: string,
): Promise<boolean> {
  const result = await redis.get(
    `user:${userId}:dismissed_changelog:${version}`,
  );
  return Boolean(result);
}
