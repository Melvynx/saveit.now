import { AnalyticsLink } from "@/components/analytics-link";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Typography } from "@workspace/ui/components/typography";
import { Bookmark } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { APP_LINKS } from "@/lib/app-links";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { URL_SCHEMA } from "../schema";
import { useCreateBookmarkAction } from "../use-create-bookmark";

export const BookmarkCardInput = () => {
  const [url, setUrl] = useState("");

  const action = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Bookmark added");
      setUrl("");
    },
  });

  const isUrl = URL_SCHEMA.safeParse(url).success;

  return (
    <Card className="aspect-[384/290] overflow-hidden gap-0 p-0">
      <CardHeader className="flex-1 content-start gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <Bookmark className="text-primary size-4" />
          <CardTitle>Add a bookmark</CardTitle>
        </div>
        <CardDescription className="line-clamp-2">
          Paste any URL and it&apos;s safely stored - no friction.
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

      <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t p-3">
        <Typography variant="muted" className="text-xs leading-snug">
          Add faster with extensions.
        </Typography>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to={APP_LINKS.extensions}
            className="rounded-md hover:bg-accent/50 transition-colors p-1.5"
          >
            <img src="https://svgl.app/library/chrome.svg" className="size-6" />
          </Link>
          <Link
            to={APP_LINKS.extensions}
            className="rounded-md hover:bg-accent/50 transition-colors p-1.5"
          >
            <img
              src="https://svgl.app/library/firefox.svg"
              className="size-6"
            />
          </Link>
          <AnalyticsLink
            href={APP_LINKS.ios}
            event={ANALYTICS_EVENTS.IOS_DOWNLOAD_CLICKED}
            properties={{ surface: "bookmark_input" }}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md hover:bg-accent/50 transition-colors p-1.5"
          >
            <img src="https://svgl.app/library/apple.svg" className="size-6" />
          </AnalyticsLink>
        </div>
      </CardFooter>
    </Card>
  );
};
