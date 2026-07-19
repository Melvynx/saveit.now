export const LUMAIL_TAGS = {
  user: "saveit-user",
  free: "saveit-free",
  hasBookmarks: "saveit-has-bookmarks",
  engaged: "saveit-engaged",
  pro: "saveit-pro",
  limitReached: "saveit-limit-reached",
} as const;

export type MarketingUser = {
  _id: string;
  email: string | null;
  name: string | null;
  stripeCustomerId: string | null;
  unsubscribed: boolean;
  metadata: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export function normalizeMarketingUser(value: unknown): MarketingUser | null {
  const user = asRecord(value);
  if (!user || typeof user._id !== "string") return null;

  return {
    _id: user._id,
    email: typeof user.email === "string" ? user.email : null,
    name: typeof user.name === "string" ? user.name : null,
    stripeCustomerId:
      typeof user.stripeCustomerId === "string" ? user.stripeCustomerId : null,
    unsubscribed: user.unsubscribed === true,
    metadata: asRecord(user.metadata) ?? {},
  };
}

export function shouldSyncMarketingUser(
  user: MarketingUser | null,
): user is MarketingUser & { email: string } {
  return Boolean(user?.email && !user.unsubscribed);
}

export function getBookmarkLifecycleTags(
  bookmarkCount: number,
  startLimitOffer: boolean,
): string[] {
  const tags: string[] = [];
  if (bookmarkCount >= 1) tags.push(LUMAIL_TAGS.hasBookmarks);
  if (bookmarkCount >= 10) tags.push(LUMAIL_TAGS.engaged);
  if (startLimitOffer) tags.push(LUMAIL_TAGS.limitReached);
  return tags;
}

export function shouldQueueBookmarkLifecycle(
  bookmarkCount: number,
  startLimitOffer: boolean,
): boolean {
  return bookmarkCount === 1 || bookmarkCount === 10 || startLimitOffer;
}
