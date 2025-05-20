"use client";

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
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CopyLinkButton } from "./bookmark-page/bookmark-actions-button";
import { usePrefetchBookmark } from "./bookmark-page/use-bookmark";
import { BookmarkPending } from "./bookmark-pending";

const DEFAULT_PREVIEW = "/images/default-preview.svg";
const DEFAULT_FAVICON = "/images/favicon.png";

export const BookmarkCard = (props: { bookmark: Bookmark }) => {
  const domainName = new URL(props.bookmark.url).hostname;
  const searchParams = useSearchParams();
  const prefetch = usePrefetchBookmark();

  if (
    props.bookmark.status === "PENDING" ||
    props.bookmark.status === "PROCESSING"
  ) {
    return <BookmarkPending bookmark={props.bookmark} />;
  }

  if (props.bookmark.type === "PAGE" || props.bookmark.type === "BLOG") {
    return (
      <Card
        className="group w-full gap-3 overflow-hidden p-0"
        onMouseEnter={() => {
          prefetch(props.bookmark.id);
        }}
      >
        <CardHeader className="relative p-0">
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
              fallbackImage={DEFAULT_PREVIEW}
              className="max-h-48 w-full rounded-md border object-cover object-top"
              alt={props.bookmark.title ?? "Preview"}
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
                <ImageWithPlaceholder
                  src={props.bookmark.faviconUrl ?? ""}
                  fallbackImage={DEFAULT_FAVICON}
                  alt="favicon"
                  className="size-4"
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
