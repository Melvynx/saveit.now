import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "saveit.chat.history-panel";
const XL_QUERY = "(min-width: 1280px)";

function readPanelPreference() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "closed";
}

function useIsXl() {
  const [isXl, setIsXl] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(XL_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(XL_QUERY);
    const update = () => setIsXl(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isXl;
}

/**
 * History lives in an inline 280px panel on xl (persisted open/closed) and in
 * a Sheet below that, so one toggle drives whichever surface fits.
 */
export function useHistoryPanel() {
  const isXl = useIsXl();
  const [panelOpen, setPanelOpen] = useState(readPanelPreference);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (isXl) setSheetOpen(false);
  }, [isXl]);

  const toggle = useCallback(() => {
    if (isXl) {
      setPanelOpen((open) => {
        const next = !open;
        window.localStorage.setItem(STORAGE_KEY, next ? "open" : "closed");
        return next;
      });
    } else {
      setSheetOpen((open) => !open);
    }
  }, [isXl]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  return useMemo(
    () => ({
      isOpen: isXl ? panelOpen : sheetOpen,
      isPanelVisible: panelOpen,
      isSheetOpen: sheetOpen && !isXl,
      setSheetOpen,
      closeSheet,
      toggle,
    }),
    [closeSheet, isXl, panelOpen, sheetOpen, toggle],
  );
}
