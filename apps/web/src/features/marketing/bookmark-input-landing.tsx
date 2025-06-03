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
import { URL_SCHEMA } from "app/app/schema";
import { useCreateBookmarkAction } from "app/app/use-create-bookmark";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const BookmarkInputLanding = () => {
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
      </CardHeader>
      <CardDescription className="flex flex-col gap-4 w-full">
        <div className="flex flex-row gap-2 w-full">
          <div className="shrink-0 size-6 justify-center flex text-sm border-primary bg-primary/10 rounded-full items-center border text-primary">
            1
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Typography>Save any website</Typography>
            <div className="flex items-center gap-2 w-full">
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
                <Button
                  variant="outline"
                  onClick={() => action.execute({ url })}
                >
                  Add
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-row gap-2 w-full items-center">
          <div className="shrink-0 size-6 justify-center flex text-sm border-primary bg-primary/10 rounded-full items-center border text-primary">
            2
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Typography>
              Our IA will save, screenshot & index all the page
            </Typography>
          </div>
        </div>
        <div className="flex flex-row gap-2 w-full">
          <div className="shrink-0 size-6 justify-center flex text-sm border-primary bg-primary/10 rounded-full items-center border text-primary">
            3
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Typography>
              Find any bookmark even years later by searching for it
            </Typography>
          </div>
        </div>
      </CardDescription>
    </Card>
  );
};
