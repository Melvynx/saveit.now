"use client";

import { APP_LINKS } from "@/lib/app-links";
import { logger } from "@/lib/logger";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocalStorage } from "react-use";

export const AlertExtensions = () => {
  const [state, setState] = useState<"loading" | "installed" | "not-installed">(
    "loading",
  );
  const [isClose, setIsClose] = useLocalStorage(
    "alert-extensions-close",
    false,
  );

  useEffect(() => {
    if (state === "installed") return;

    setTimeout(() => {
      if (typeof window === "undefined") return;
      const container = document.querySelector("#saveit-now-container");

      setState(!container ? "installed" : "not-installed");
      logger.debug("Extension container check:", { found: !!container });
    }, 2000);
  }, [state]);

  if (state === "loading") return;

  if (state === "installed") return;

  if (isClose) return;

  return (
    <Alert className="flex flex-row items-start justify-start">
      <div>
        <AlertTitle>Extension not installed</AlertTitle>
        <AlertDescription>
          Install the extension to save bookmarks in your browser.
        </AlertDescription>
      </div>
      <div className="flex gap-2 mt-2 flex-1 justify-end">
        <Button asChild size="sm" variant="outline">
          <Link href={APP_LINKS.extensions}>Install extension</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => setIsClose(true)}>
          Close
        </Button>
      </div>
    </Alert>
  );
};
