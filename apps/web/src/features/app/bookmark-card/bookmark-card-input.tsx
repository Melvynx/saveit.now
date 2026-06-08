import { PosthogLink } from "@/components/posthog-link";
import { ANALYTICS } from "@/lib/analytics";
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
    <Card className="h-full overflow-hidden p-0">
      <CardHeader className="pt-4">
        <div className="flex items-center gap-2">
          <Bookmark className="text-primary size-4" />
          <CardTitle>Add a bookmark</CardTitle>
        </div>
        <CardDescription>
          Paste any URL and it's safely stored - no friction.
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

      <CardFooter className="flex flex-col gap-2 border-t !pt-4">
        <Typography variant="muted">
          Looking for quickly add a bookmark? Install our browser extension.
        </Typography>
        <div className="flex items-center gap-2">
          <Link
            to={APP_LINKS.extensions}
            className="rounded-md hover:bg-accent/50 transition-colors p-2"
          >
            <img src="https://svgl.app/library/chrome.svg" className="size-8" />
          </Link>
          <Link
            to={APP_LINKS.extensions}
            className="rounded-md hover:bg-accent/50 transition-colors p-2"
          >
            <img
              src="https://svgl.app/library/firefox.svg"
              className="size-8"
            />
          </Link>
          <PosthogLink
            href={APP_LINKS.ios}
            event={ANALYTICS.IOS_DOWNLOAD}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md hover:bg-accent/50 transition-colors p-2"
          >
            <img src="https://svgl.app/library/apple.svg" className="size-8" />
          </PosthogLink>
        </div>
      </CardFooter>
    </Card>
  );
};
