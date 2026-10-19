import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { APP_LINKS } from "@/lib/app-links";
import { cn } from "@workspace/ui/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const CHROME_EXTENSION_ID = "mpjdmcmkgmeijijjecpffckjgjgdcfpi";
const DISMISSED_AT_KEY = "saveit:extension-prompt-dismissed-at";
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;
const INSTALL_CLICK_DISMISS_FOR_MS = 90 * 24 * 60 * 60 * 1000;

function isChromiumDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  return (
    /Chrome\//.test(userAgent) && !/Mobile|Android|iPhone|iPad/.test(userAgent)
  );
}

function isDismissed(): boolean {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY));
    return Number.isFinite(dismissedAt) && Date.now() < dismissedAt;
  } catch {
    return false;
  }
}

function dismissFor(durationMs: number): void {
  try {
    window.localStorage.setItem(
      DISMISSED_AT_KEY,
      String(Date.now() + durationMs),
    );
  } catch {
    // Ignore storage failures; the prompt simply reappears next visit.
  }
}

// The extension exposes images/icon48.png as a web-accessible resource, so a
// successful load means the extension is installed. Firefox cannot be probed
// (per-install UUIDs), which isChromiumDesktop already excludes.
function useExtensionInstalled(): boolean | null {
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isChromiumDesktop()) return;

    let cancelled = false;
    const probe = new Image();
    const settle = (result: boolean) => {
      if (!cancelled) setInstalled(result);
    };
    probe.onload = () => settle(true);
    probe.onerror = () => settle(false);
    probe.src = `chrome-extension://${CHROME_EXTENSION_ID}/images/icon48.png`;

    return () => {
      cancelled = true;
    };
  }, []);

  return installed;
}

/** Small dismissible "install the extension" card for the sidebar footer. */
export function ExtensionInstallCard({ className }: { className?: string }) {
  const installed = useExtensionInstalled();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (installed !== false || isDismissed()) return;
    setVisible(true);
  }, [installed]);

  const close = (durationMs: number) => {
    dismissFor(durationMs);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Install the SaveIt browser extension"
      className={cn(
        "animate-rise-in relative rounded-xl bg-card p-3 shadow-xs ring-1 ring-foreground/6",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => close(DISMISS_FOR_MS)}
        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex items-center gap-2 pr-6">
        <img src="/icon.png" alt="" className="size-5 rounded-[5px]" />
        <p className="text-[13px] font-medium text-foreground">
          Save from any tab
        </p>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
        The Chrome extension saves the page you are on in one click.
      </p>
      <a
        href={APP_LINKS.chrome}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          trackAnalyticsEvent(ANALYTICS_EVENTS.EXTENSION_INSTALL_CLICKED, {
            source: "app_prompt",
            browser: "chrome",
          });
          close(INSTALL_CLICK_DISMISS_FOR_MS);
        }}
        className="mt-2.5 inline-flex h-7 items-center rounded-md bg-foreground px-2.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Add to Chrome
      </a>
    </aside>
  );
}
