"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Typography } from "@workspace/ui/components/typography";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { URL_SCHEMA } from "./schema";
import { useCreateBookmarkAction } from "./use-create-bookmark";

export const BookmarkInput = () => {
  const [url, setUrl] = useState("");

  const action = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Bookmark added");

      setUrl("");
    },
  });
  const isUrl = URL_SCHEMA.safeParse(url).success;

  return (
    <Card className="w-full p-4 gap-0 overflow-hidden h-[var(--card-height)]">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center gap-2">
          <Bookmark className="text-primary size-4" />
          <CardTitle>Add a bookmark</CardTitle>
        </div>
        <CardDescription>
          Paste any URL and it's safely stored—no friction.
        </CardDescription>
        <div className="flex items-center gap-2">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                action.execute({ url });
              }
            }}
          />
          {isUrl ? (
            <Button variant="outline" onClick={() => action.execute({ url })}>
              Add
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardDescription className="flex flex-col gap-2">
        <Typography variant="muted">
          Looking for quickly add a bookmark? Install our browser extension.
        </Typography>
        <div className="flex items-center gap-2">
          <Link
            href="/app/extensions"
            className="rounded-md hover:bg-accent/50 transition-colors p-2"
          >
            <img src="https://svgl.app/library/chrome.svg" className="size-8" />
          </Link>
          <Link
            href="/app/extensions"
            className="rounded-md hover:bg-accent/50 transition-colors p-2"
          >
            <img
              src="https://svgl.app/library/firefox.svg"
              className="size-8"
            />
          </Link>
        </div>
      </CardDescription>
    </Card>
  );
};
