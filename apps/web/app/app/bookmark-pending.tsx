"use client";

import { upfetch } from "@/lib/up-fetch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "@workspace/database";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { deleteBookmarkAction } from "app/app/bookmark-page/bookmarks.action";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();

  const deleteAction = useAction(deleteBookmarkAction, {
    onSuccess: () => {
      toast.success("Bookmark deleted");
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  return (
    <Card className="w-full p-4">
      <CardHeader className="p-0">
        <div className="w-full h-48 bg-border gap-4 object-top object-cover rounded-md flex items-center justify-center flex-col">
          {token.data ? (
            <BookmarkProgress token={token.data.token} />
          ) : (
            <p>Loading...</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              deleteAction.execute({
                bookmarkId: props.bookmark.id,
              })
            }
          >
            Stop
          </Button>
        </div>
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
    </Card>
  );
};
