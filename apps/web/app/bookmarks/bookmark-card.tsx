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
import { CopyLinkButton } from "../@modal/(.)bookmarks/[bookmarkId]/utils";
import { BookmarkPending } from "./bookmark-pending";

const DEFAULT_PREVIEW = "/images/default-preview.svg";
const DEFAULT_FAVICON = "/images/default-favicon.svg";

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
      <Card className="w-full p-0 mb-4 gap-3 group break-inside-avoid-column">
        <CardHeader className="px-4 pt-4 relative">
          <Link href={`/bookmarks/${props.bookmark.id}`}>
            <ImageWithPlaceholder
              src={props.bookmark.preview ?? ""}
              fallbackImage={DEFAULT_PREVIEW}
              className="w-full max-h-48 object-top object-cover rounded-md"
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
              <ImageWithPlaceholder
                src={props.bookmark.faviconUrl ?? ""}
                fallbackImage={DEFAULT_FAVICON}
                alt="favicon"
                className="w-4 h-4"
              />
              <div className="flex flex-col gap-2">
                <CardTitle>{domainName}</CardTitle>
                <CardDescription>{props.bookmark.title}</CardDescription>
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

  return <Card>{props.bookmark.type}</Card>;
};
