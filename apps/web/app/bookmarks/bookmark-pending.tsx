"use client";

import { Bookmark } from "@workspace/database";
import { upfetch } from "@/lib/up-fetch";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { z } from "zod";
import BookmarkProgress from "./bookmark-progress";

export const BookmarkPending = (props: { bookmark: Bookmark }) => {
  const domainName = new URL(props.bookmark.url).hostname;

  const token = useQuery({
    queryKey: ["bookmark", props.bookmark.id],
    queryFn: () => {
      return upfetch(`/api/bookmarks/${props.bookmark.id}/subscribe`, {
        schema: z.object({
          token: z.any(),
        }),
      });
    },
  });

  const pageMetadata = useQuery({
    queryKey: ["bookmark", props.bookmark.id, "page-metadata"],
    queryFn: async () => {
      const result = await fetch(props.bookmark.url);
      const html = await result.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Access head content
      const title = doc.querySelector("title")?.textContent;
      const faviconUrl = doc
        .querySelector("link[rel='icon']")
        ?.getAttribute("href");

      return {
        title,
        faviconUrl: faviconUrl?.startsWith("http")
          ? faviconUrl
          : `https://${domainName}${faviconUrl}`,
      };
    },
  });

  return (
    <Card className="w-full p-4 break-inside-avoid-column mb-4">
      <CardHeader className="p-0">
        <Skeleton className="aspect-video object-cover rounded-md" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-start gap-2">
          <img
            src={pageMetadata.data?.faviconUrl ?? ""}
            alt="favicon"
            className="w-4 h-4"
          />
          <div className="flex flex-col gap-2">
            <CardTitle>{domainName}</CardTitle>
            <CardDescription>
              {pageMetadata.data?.title ?? "Processing..."}
            </CardDescription>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {token.data ? (
          <BookmarkProgress token={token.data.token} />
        ) : (
          <p>bonsoir</p>
        )}
      </CardFooter>
    </Card>
  );
};
