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
import { CopyLinkButton } from "../@modal/(.)bookmarks/[bookmarkId]/bookmark-actions-button";
import { BookmarkPending } from "./bookmark-pending";

const DEFAULT_PREVIEW = "/images/default-preview.svg";
const DEFAULT_FAVICON = "/images/favicon.png";

export const BookmarkCard = (props: { bookmark: Bookmark }) => {
  const domainName = new URL(props.bookmark.url).hostname;

  if (
    props.bookmark.status === "PENDING" ||
    props.bookmark.status === "PROCESSING"
  ) {
    return <BookmarkPending bookmark={props.bookmark} />;
  }

  if (props.bookmark.type === "PAGE" || props.bookmark.type === "BLOG") {
    return (
      <Card className="w-full p-0 gap-3 group">
        <CardHeader className="px-4 pt-4 relative">
          <Link href={`/bookmarks/${props.bookmark.id}`}>
            <ImageWithPlaceholder
              src={props.bookmark.preview ?? ""}
              fallbackImage={DEFAULT_PREVIEW}
              className="w-full max-h-48 object-top object-cover rounded-md border"
              alt={props.bookmark.title ?? "Preview"}
            />
          </Link>
          <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1 flex items-center">
            <Button
              variant="secondary"
              size="icon"
              className="size-8"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={props.bookmark.url} target="_blank">
                <ExternalLink className="size-4 text-muted-foreground" />
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
        <Link href={`/bookmarks/${props.bookmark.id}`}>
          <CardContent className="px-4 pb-4">
            <div className="flex items-start gap-2">
              <div className="size-6 shrink-0 border rounded items-center justify-center flex">
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
        className="h-64 w-full p-0 break-inside-avoid-column"
      ></Card>
    );
  }

  return null;
};
