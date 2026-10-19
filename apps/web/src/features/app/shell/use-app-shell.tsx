import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const COLLAPSED_STORAGE_KEY = "saveit:sidebar-collapsed";
export const MOBILE_QUERY = "(max-width: 767px)";

type AppShellContextValue = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isMobile: boolean;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

function readCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const isMobile = useIsMobileViewport();

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Persisting is best effort.
    }
  }, [collapsed]);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((value) => !value);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const value = useMemo<AppShellContextValue>(
    () => ({
      collapsed,
      setCollapsed,
      toggleSidebar,
      mobileOpen,
      setMobileOpen,
      isMobile,
      shortcutsOpen,
      setShortcutsOpen,
    }),
    [collapsed, toggleSidebar, mobileOpen, isMobile, shortcutsOpen],
  );

  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error("useAppShell must be used inside <AppShell>");
  }
  return value;
}

/** True when rendered inside the /app shell (sidebar layout). */
export function useInAppShell() {
  return useContext(AppShellContext) !== null;
}
