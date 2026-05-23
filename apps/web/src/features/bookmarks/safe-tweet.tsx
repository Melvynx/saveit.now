"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  ExternalLink,
  Heart,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import React from "react";
import type { ComponentProps } from "react";
import type { MediaDetails, Tweet as TweetApiData } from "react-tweet/api";

const MAX_TITLE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 360;
const MAX_TWEET_TEXT_LENGTH = 500;

type SafeTweetProps = {
  tweetId?: unknown;
  tweet?: unknown;
  url?: unknown;
  title?: unknown;
  summary?: unknown;
  className?: unknown;
  compact?: unknown;
  showOpenButton?: unknown;
};

type SafeTweetViewModel = {
  id: string | null;
  url: string | null;
  text: string | null;
  createdAt: string | null;
  authorName: string;
  authorHandle: string | null;
  avatarUrl: string | null;
  favoriteCount: number | null;
  replyCount: number | null;
  media: SafeTweetMedia[];
  compact: boolean;
  showOpenButton: boolean;
};

type SafeTweetMedia = {
  url: string;
  alt: string;
  type: "photo" | "video" | "animated_gif";
};

const getSafeTweetId = (tweetId: unknown) => {
  if (typeof tweetId !== "string") return null;

  const trimmed = tweetId.trim();
  return /^\d{5,30}$/.test(trimmed) ? trimmed : null;
};

const getSafeString = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, maxLength);
};

const getSafeNumber = (value: unknown) => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getSafeClassName = (className: unknown) => {
  return typeof className === "string" ? className : undefined;
};

const getSafeBoolean = (value: unknown, fallback: boolean) => {
  return typeof value === "boolean" ? value : fallback;
};

const getSafeHttpUrl = (url: unknown) => {
  if (typeof url !== "string") return null;

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl.toString();
    }
  } catch {
    return null;
  }

  return null;
};

const getSafeTweetUrl = (tweetId: string | null, url?: unknown) => {
  return getSafeHttpUrl(url) ?? (tweetId ? `https://x.com/i/status/${tweetId}` : null);
};

const getTweetData = (tweet: unknown) => {
  if (!tweet || typeof tweet !== "object") return null;

  return tweet as Partial<TweetApiData> & {
    tweetId?: unknown;
    reply_count?: unknown;
    retweet_count?: unknown;
  };
};

const getSafeMedia = (mediaDetails: unknown): SafeTweetMedia[] => {
  if (!Array.isArray(mediaDetails)) return [];

  return mediaDetails
    .map((media: unknown) => {
      if (!media || typeof media !== "object") return null;

      const safeMedia = media as Partial<MediaDetails>;
      const type = safeMedia.type;
      const url = getSafeHttpUrl(safeMedia.media_url_https);

      if (
        !url ||
        (type !== "photo" && type !== "video" && type !== "animated_gif")
      ) {
        return null;
      }

      return {
        url,
        type,
        alt: getSafeString(
          "ext_alt_text" in safeMedia ? safeMedia.ext_alt_text : null,
          160,
        ) ?? "Tweet media",
      };
    })
    .filter((media): media is SafeTweetMedia => Boolean(media))
    .slice(0, 4);
};

const formatTweetDate = (value: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatTweetNumber = (value: number) => {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

const buildTweetViewModel = ({
  tweetId,
  tweet,
  url,
  title,
  summary,
  compact,
  showOpenButton,
}: Pick<
  SafeTweetProps,
  | "tweetId"
  | "tweet"
  | "url"
  | "title"
  | "summary"
  | "compact"
  | "showOpenButton"
>): SafeTweetViewModel => {
  const tweetData = getTweetData(tweet);
  const safeTweetId =
    getSafeTweetId(tweetData?.tweetId) ??
    getSafeTweetId(tweetData?.id_str) ??
    getSafeTweetId(tweetId);
  const user = tweetData?.user;
  const safeHandle = getSafeString(user?.screen_name, 40);
  const safeName =
    getSafeString(user?.name, MAX_TITLE_LENGTH) ??
    getSafeString(title, MAX_TITLE_LENGTH) ??
    "Tweet";
  const safeText =
    getSafeString(tweetData?.text, MAX_TWEET_TEXT_LENGTH) ??
    getSafeString(summary, MAX_SUMMARY_LENGTH);

  return {
    id: safeTweetId,
    url: getSafeTweetUrl(safeTweetId, url),
    text: safeText,
    createdAt: getSafeString(tweetData?.created_at, 80),
    authorName: safeName,
    authorHandle: safeHandle,
    avatarUrl: getSafeHttpUrl(user?.profile_image_url_https),
    favoriteCount: getSafeNumber(tweetData?.favorite_count),
    replyCount:
      getSafeNumber(tweetData?.conversation_count) ??
      getSafeNumber(tweetData?.reply_count),
    media: getSafeMedia(tweetData?.mediaDetails),
    compact: getSafeBoolean(compact, false),
    showOpenButton: getSafeBoolean(showOpenButton, true),
  };
};

const TweetStat = ({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof MessageCircle;
  value: number | null;
  label: string;
}) => {
  if (value === null) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      <span aria-label={label}>{formatTweetNumber(value)}</span>
    </span>
  );
};

function TweetMediaGrid({
  media,
  compact,
}: {
  media: SafeTweetMedia[];
  compact: boolean;
}) {
  if (!media.length) return null;

  const visibleMedia = compact ? media.slice(0, 1) : media;

  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-md border bg-muted/30",
        visibleMedia.length === 1 ? "grid-cols-1" : "grid-cols-2",
      )}
    >
      {visibleMedia.map((item, index) => (
        <div
          key={`${item.url}-${index}`}
          className={cn(
            "relative aspect-video overflow-hidden",
            visibleMedia.length > 1 && "border-border odd:border-r",
            visibleMedia.length > 2 && index < 2 && "border-b",
          )}
        >
          <div
            role="img"
            aria-label={item.alt}
            className="size-full bg-cover bg-center"
            style={{ backgroundImage: `url(${item.url})` }}
          />
          {item.type !== "photo" && (
            <span className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase text-foreground backdrop-blur-sm">
              {item.type === "video" ? "Video" : "GIF"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function OpenTweetButton({
  url,
  variant = "ghost",
}: {
  url: string | null;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  if (!url) return null;

  return (
    <Button asChild variant={variant} size="sm" className="h-8 gap-2 px-2">
      <a href={url} target="_blank" rel="noreferrer">
        <ExternalLink className="size-3.5" />
        Open tweet
      </a>
    </Button>
  );
}

function TweetCard({ tweet }: { tweet: SafeTweetViewModel }) {
  const formattedDate = formatTweetDate(tweet.createdAt);

  return (
    <article className="h-full overflow-hidden rounded-md border bg-card p-4 text-card-foreground shadow-sm">
      <header className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted bg-cover bg-center text-xs font-semibold uppercase text-muted-foreground"
          role={tweet.avatarUrl ? "img" : undefined}
          aria-label={tweet.avatarUrl ? tweet.authorName : undefined}
          style={
            tweet.avatarUrl
              ? { backgroundImage: `url(${tweet.avatarUrl})` }
              : undefined
          }
        >
          {!tweet.avatarUrl && tweet.authorName.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold leading-none">
              {tweet.authorName}
            </p>
            {tweet.authorHandle && (
              <p className="truncate text-xs text-muted-foreground">
                @{tweet.authorHandle}
              </p>
            )}
          </div>
          {formattedDate && (
            <p className="mt-1 text-xs text-muted-foreground">{formattedDate}</p>
          )}
        </div>
        {tweet.showOpenButton && <OpenTweetButton url={tweet.url} />}
      </header>

      {tweet.text ? (
        <p
          className={cn(
            "mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground",
            tweet.compact && "line-clamp-5",
          )}
        >
          {tweet.text}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          This tweet could not be loaded.
        </p>
      )}

      <div className="mt-3">
        <TweetMediaGrid media={tweet.media} compact={tweet.compact} />
      </div>

      <footer className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <TweetStat
            icon={MessageCircle}
            value={tweet.replyCount}
            label="Replies"
          />
          <TweetStat
            icon={Heart}
            value={tweet.favoriteCount}
            label="Likes"
          />
        </div>
        {tweet.id && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Repeat2 className="size-3.5" aria-hidden="true" />
            X post
          </span>
        )}
      </footer>
    </article>
  );
}

export function SafeTweet({
  tweetId,
  tweet,
  url,
  title,
  summary,
  className,
  compact,
  showOpenButton,
}: SafeTweetProps) {
  const safeClassName = getSafeClassName(className);
  const viewModel = buildTweetViewModel({
    tweetId,
    tweet,
    url,
    title,
    summary,
    compact,
    showOpenButton,
  });

  return (
    <div className={cn("tweet-container", safeClassName)}>
      <TweetCard tweet={viewModel} />
    </div>
  );
}
