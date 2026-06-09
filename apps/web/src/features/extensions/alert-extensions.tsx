import { APP_LINKS } from "@/lib/app-links";
import { logger } from "@/lib/logger";
import { Link } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { useEffect, useState } from "react";

const useBooleanLocalStorage = (key: string, defaultValue: boolean) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);

    if (stored !== null) {
      setValue(stored === "true");
    }
  }, [key]);

  const updateValue = (nextValue: boolean) => {
    window.localStorage.setItem(key, String(nextValue));
    setValue(nextValue);
  };

  return [value, updateValue] as const;
};

export const AlertExtensions = () => {
  const [state, setState] = useState<"loading" | "installed" | "not-installed">(
    "loading",
  );
  const [isClose, setIsClose] = useBooleanLocalStorage(
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
          <Link to={APP_LINKS.extensions}>Install extension</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => setIsClose(true)}>
          Close
        </Button>
      </div>
    </Alert>
  );
};
