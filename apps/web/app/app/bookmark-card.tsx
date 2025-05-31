"use client";

import { YouTubeEmbed } from "@next/third-parties/google";
import { Bookmark } from "@workspace/database";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ImageWithPlaceholder } from "@workspace/ui/components/image-with-placeholder";
import { ExternalLink, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useMeasure from "react-use-measure";

import { Input } from "@workspace/ui/components/input";
import { BookmarkFavicon } from "./bookmark-favicon";
import { CopyLinkButton } from "./bookmark-page/bookmark-actions-button";
import { usePrefetchBookmark } from "./bookmark-page/use-bookmark";
import { BookmarkPending, DeleteButtonAction } from "./bookmark-pending";
import { DEFAULT_PREVIEW } from "./bookmark.default";

const HEADER_HEIGHT = 180;

export const BookmarkCard = (props: { bookmark: Bookmark }) => {
  const domainName = new URL(props.bookmark.url).hostname;
  const searchParams = useSearchParams();
  const prefetch = usePrefetchBookmark();
  const [ref, bounds] = useMeasure();

  if (props.bookmark.status === "ERROR") {
    const metadata = props.bookmark.metadata as { error: string };
    return (
      <Card
        className="group w-full gap-4 overflow-hidden p-0 h-[var(--card-height)]"
        onMouseEnter={() => {
          prefetch(props.bookmark.id);
        }}
      >
        <CardHeader
          className="relative p-0 rounded-xl border flex items-center justify-center flex-col gap-4"
          style={{
            height: HEADER_HEIGHT,
            overflow: "hidden",
          }}
          ref={ref}
        >
          <XCircle className="text-muted-foreground size-10" />
          <DeleteButtonAction bookmarkId={props.bookmark.id}>
            Delete
          </DeleteButtonAction>
          <Input type="text" value={props.bookmark.url} className="max-w-xs" />
        </CardHeader>
        <Link
          href={{
            pathname: "/app",
            query: {
              ...Object.fromEntries(searchParams.entries()),
              b: props.bookmark.id,
            },
          }}
        >
          <CardContent className="px-4 pb-4">
            <div className="flex items-start gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded border">
                <X className="text-muted-foreground size-4" />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle>Error</CardTitle>
                <CardDescription className="line-clamp-1">
                  {metadata.error}
                </CardDescription>
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  }

  if (
    props.bookmark.status === "PENDING" ||
    props.bookmark.status === "PROCESSING"
  ) {
    return <BookmarkPending bookmark={props.bookmark} />;
  }

  if (
    props.bookmark.type &&
    ["PAGE", "BLOG", "IMAGE"].includes(props.bookmark.type)
  ) {
    const metadata = props.bookmark.metadata as any;
    const isVerticalImage = metadata?.width < metadata?.height;
    return (
      <Card
        className="group w-full gap-4 overflow-hidden p-0 h-[var(--card-height)]"
        onMouseEnter={() => {
          prefetch(props.bookmark.id);
        }}
      >
        <CardHeader
          className="relative p-0 rounded-xl border"
          style={{
            height: HEADER_HEIGHT,
            overflow: "hidden",
          }}
          ref={ref}
        >
          <Link
            href={{
              pathname: "/app",
              query: {
                ...Object.fromEntries(searchParams.entries()),
                b: props.bookmark.id,
              },
            }}
          >
            <ImageWithPlaceholder
              src={props.bookmark.preview ?? ""}
              fallbackImage={props.bookmark.ogImageUrl ?? DEFAULT_PREVIEW}
              className="h-full w-full object-cover object-center mx-auto"
              alt={props.bookmark.title ?? "Preview"}
              style={
                props.bookmark.type === "IMAGE"
                  ? {
                      width: isVerticalImage ? bounds.width : "auto",
                      height: isVerticalImage ? "auto" : bounds.height,
                    }
                  : {
                      width: bounds.width,
                      height: bounds.height,
                    }
              }
            />
          </Link>
          <div className="absolute right-5 top-5 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              variant="secondary"
              size="icon"
              className="size-8"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={props.bookmark.url} target="_blank">
                <ExternalLink className="text-muted-foreground size-4" />
              </Link>
            </Button>
            <CopyLinkButton
              url={props.bookmark.url}
              variant="secondary"
              size="icon"
              className="size-8"
            />
          </div>
        </CardHeader>
        <Link
          href={{
            pathname: "/app",
            query: {
              ...Object.fromEntries(searchParams.entries()),
              b: props.bookmark.id,
            },
          }}
        >
          <CardContent className="px-4 pb-4">
            <div className="flex items-start gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded border">
                <BookmarkFavicon
                  faviconUrl={props.bookmark.faviconUrl}
                  bookmarkType={props.bookmark.type}
                />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle>{domainName}</CardTitle>
                <CardDescription className="line-clamp-1">
                  {props.bookmark.title}
                </CardDescription>
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  }

  if (props.bookmark.type === "YOUTUBE") {
    const metadata = props.bookmark.metadata as { youtubeId: string };
    return (
      <Card
        className="group w-full gap-4 overflow-hidden p-0 h-[var(--card-height)]"
        onMouseEnter={() => {
          prefetch(props.bookmark.id);
        }}
      >
        <CardHeader
          className="relative p-0 rounded-xl border"
          style={{
            height: HEADER_HEIGHT,
            overflow: "hidden",
          }}
        >
          <YouTubeEmbed videoid={metadata.youtubeId} width={bounds.width} />
          <div className="absolute right-5 top-5 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              variant="secondary"
              size="icon"
              className="size-8"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={props.bookmark.url} target="_blank">
                <ExternalLink className="text-muted-foreground size-4" />
              </Link>
            </Button>
            <CopyLinkButton
              url={props.bookmark.url}
              variant="secondary"
              size="icon"
              className="size-8"
            />
          </div>
        </CardHeader>
        <Link
          href={{
            pathname: "/app",
            query: {
              ...Object.fromEntries(searchParams.entries()),
              b: props.bookmark.id,
            },
          }}
        >
          <CardContent className="px-4 pb-4">
            <div className="flex items-start gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded border">
                <BookmarkFavicon
                  faviconUrl={props.bookmark.faviconUrl}
                  bookmarkType={props.bookmark.type}
                />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle>{domainName}</CardTitle>
                <CardDescription className="line-clamp-1">
                  {props.bookmark.title}
                </CardDescription>
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  }

  if (props.bookmark.type === "IMAGE") {
    return (
      <Card
        style={{
          backgroundImage: `url(${props.bookmark.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        className="h-64 w-full break-inside-avoid-column p-0"
      ></Card>
    );
  }

  return null;
};
