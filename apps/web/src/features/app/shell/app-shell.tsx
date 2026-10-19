import { useLocation } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetTitle } from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { type ReactNode, useEffect } from "react";
import { tchao } from "tchao/react";
import { CommandPalette } from "../command-palette/command-palette";
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "../command-palette/command-palette-provider";
import { AppSidebar } from "./app-sidebar";
import { MobileTopBar } from "./mobile-top-bar";
import { isTypingTarget } from "./shortcuts";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { AppShellProvider, useAppShell } from "./use-app-shell";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppShellProvider>
      <CommandPaletteProvider>
        <AppShellLayout>{children}</AppShellLayout>
        <CommandPalette />
        <ShortcutsDialog />
        <ShellHotkeys />
        <HideFeedbackLauncher />
      </CommandPaletteProvider>
    </AppShellProvider>
  );
}

function AppShellLayout({ children }: { children: ReactNode }) {
  const { collapsed, mobileOpen, setMobileOpen } = useAppShell();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.searchStr, setMobileOpen]);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside
        data-collapsed={collapsed || undefined}
        className={cn(
          "sticky top-0 z-40 hidden h-dvh shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-(--ease-out-soft) motion-reduce:transition-none md:block",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <AppSidebar variant="desktop" />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[280px] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground data-[side=left]:w-[280px] md:hidden"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar variant="mobile" />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main id="app-main" className="flex min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Global shell keys. Runs in the window capture phase so mod+K wins over any
 * page-level binding and never reaches the browser's own shortcut.
 */
function ShellHotkeys() {
  const { toggleSidebar, setShortcutsOpen } = useAppShell();
  const palette = useCommandPalette();
  const { toggle: togglePalette } = palette;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && !event.shiftKey && !event.altKey && key === "k") {
        event.preventDefault();
        event.stopPropagation();
        togglePalette();
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (mod && !event.shiftKey && !event.altKey && key === "b") {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (mod || event.altKey) return;

      if (event.key === "[" && !event.shiftKey) {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [setShortcutsOpen, toggleSidebar, togglePalette]);

  return null;
}

/** The feedback launcher would cover content; it opens from the user menu. */
function HideFeedbackLauncher() {
  useEffect(() => {
    tchao.hide();
    return () => tchao.show();
  }, []);

  return null;
}
