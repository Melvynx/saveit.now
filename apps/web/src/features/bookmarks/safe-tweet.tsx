"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ExternalLink } from "lucide-react";
import { Component, ReactNode } from "react";
import { Tweet } from "react-tweet";

const MAX_FALLBACK_TEXT_LENGTH = 280;

const reportTweetError = (error: unknown) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("Failed to render tweet", error);
  }
};

type SafeTweetProps = {
  tweetId?: unknown;
  url?: unknown;
  title?: unknown;
  summary?: unknown;
  className?: unknown;
};

type TweetBoundaryProps = {
  tweetId: string;
  fallback: ReactNode;
  children: ReactNode;
};

type TweetBoundaryState = {
  hasError: boolean;
};

class TweetBoundary extends Component<TweetBoundaryProps, TweetBoundaryState> {
  state: TweetBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    reportTweetError(error);
  }

  componentDidUpdate(previousProps: TweetBoundaryProps) {
    if (
      this.state.hasError &&
      previousProps.tweetId !== this.props.tweetId
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const getSafeTweetId = (tweetId: unknown) => {
  if (typeof tweetId !== "string") return null;

  const trimmed = tweetId.trim();
  return /^\d{5,30}$/.test(trimmed) ? trimmed : null;
};

const getSafeString = (value: unknown, maxLength = MAX_FALLBACK_TEXT_LENGTH) => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, maxLength);
};

const getSafeClassName = (className: unknown) => {
  return typeof className === "string" ? className : undefined;
};

const getSafeTweetUrl = (tweetId: string | null, url?: unknown) => {
  if (typeof url === "string") {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return parsedUrl.toString();
      }
    } catch {
      // Fall back to the canonical tweet URL below.
    }
  }

  return tweetId ? `https://x.com/i/status/${tweetId}` : null;
};

function TweetFallback({
  tweetId,
  url,
  title,
  summary,
}: {
  tweetId: string | null;
  url: string | null;
  title: string | null;
  summary: string | null;
}) {
  return (
    <div className="rounded-md border bg-card p-4 text-card-foreground">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{title || "Tweet"}</p>
        {summary && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {summary}
          </p>
        )}
        {!summary && tweetId && (
          <p className="text-sm text-muted-foreground">
            This tweet could not be embedded.
          </p>
        )}
        {url && (
          <Button asChild variant="secondary" size="sm" className="mt-2 w-fit">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3" />
              Open tweet
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function SafeTweet({
  tweetId,
  url,
  title,
  summary,
  className,
}: SafeTweetProps) {
  const safeTweetId = getSafeTweetId(tweetId);
  const safeUrl = getSafeTweetUrl(safeTweetId, url);
  const safeTitle = getSafeString(title, 120);
  const safeSummary = getSafeString(summary, 360);
  const safeClassName = getSafeClassName(className);
  const fallback = (
    <TweetFallback
      tweetId={safeTweetId}
      url={safeUrl}
      title={safeTitle}
      summary={safeSummary}
    />
  );

  if (!safeTweetId) {
    return fallback;
  }

  return (
    <div className={cn("tweet-container", safeClassName)}>
      <TweetBoundary tweetId={safeTweetId} fallback={fallback}>
        <Tweet id={safeTweetId} fallback={fallback} onError={reportTweetError} />
      </TweetBoundary>
    </div>
  );
}
