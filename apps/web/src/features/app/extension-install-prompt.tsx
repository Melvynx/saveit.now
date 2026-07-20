import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { APP_LINKS } from "@/lib/app-links";
import { LandingStyle } from "@/features/marketing/landing/theme";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const CHROME_EXTENSION_ID = "mpjdmcmkgmeijijjecpffckjgjgdcfpi";
const DISMISSED_AT_KEY = "saveit:extension-prompt-dismissed-at";
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;
const INSTALL_CLICK_DISMISS_FOR_MS = 90 * 24 * 60 * 60 * 1000;
const FONT_LINK_ID = "saveit-instrument-serif";

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
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now() + durationMs));
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

function ensureSerifFontLoaded(): void {
  if (document.getElementById(FONT_LINK_ID)) return;

  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap";
  document.head.appendChild(link);
}

export function ExtensionInstallPrompt() {
  const installed = useExtensionInstalled();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (installed !== false || isDismissed()) return;

    ensureSerifFontLoaded();
    const timer = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, [installed]);

  const close = (durationMs: number) => {
    dismissFor(durationMs);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          aria-label="Install the SaveIt browser extension"
          className="fixed bottom-24 right-6 z-40 hidden w-[320px] lg:block"
        >
          <LandingStyle />
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1a0e15] shadow-[0_24px_70px_rgba(10,4,8,0.5),0_6px_22px_rgba(10,4,8,0.3)]">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(110%_120%_at_88%_-20%,rgba(255,143,112,0.18),transparent_55%),radial-gradient(90%_110%_at_8%_-25%,rgba(201,163,232,0.13),transparent_52%)]"
            />
            <div aria-hidden className="landing-noise absolute inset-0" />
            <div
              aria-hidden
              className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8f70] to-transparent opacity-80"
            />

            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => close(DISMISS_FOR_MS)}
              className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-full text-[#f7ede8]/50 transition-colors hover:bg-white/10 hover:text-[#f7ede8]"
            >
              <X className="size-3.5" />
            </button>

            <div className="relative p-5">
              <img
                src="/icon.png"
                alt=""
                className="size-10 rounded-xl shadow-[0_4px_14px_rgba(255,143,112,0.35)]"
              />

              <p className="mt-4 text-[22px] leading-tight tracking-tight text-[#f7ede8]">
                Save from{" "}
                <em className="landing-display landing-gradient-text">
                  anywhere.
                </em>
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#a89099]">
                The Chrome extension turns any page into a one-click save.
              </p>

              <div className="landing-press mt-5 flex items-center gap-2">
                <a
                  href={APP_LINKS.chrome}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    trackAnalyticsEvent(
                      ANALYTICS_EVENTS.EXTENSION_INSTALL_CLICKED,
                      { source: "app_prompt", browser: "chrome" },
                    );
                    close(INSTALL_CLICK_DISMISS_FOR_MS);
                  }}
                  className="inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#120a10] transition-transform hover:scale-[1.03] active:scale-[0.96]"
                >
                  Add to Chrome
                </a>
                <button
                  type="button"
                  onClick={() => close(DISMISS_FOR_MS)}
                  className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-[#f7ede8]/60 transition-colors hover:text-[#f7ede8]"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
