import { Link } from "@tanstack/react-router";
import { Menu, Plus, Search } from "lucide-react";
import { useCommandPalette } from "../command-palette/command-palette-provider";
import { useAppShell } from "./use-app-shell";

const iconButton =
  "flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

/** 52px sticky bar shown below 768px; the sidebar lives in a Sheet there. */
export function MobileTopBar() {
  const { setMobileOpen } = useAppShell();
  const palette = useCommandPalette();

  return (
    <div className="sticky top-0 z-40 flex h-13 items-center gap-1 border-b border-border bg-background/85 px-2 backdrop-blur-xl backdrop-saturate-150 md:hidden">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className={iconButton}
      >
        <Menu className="size-[18px]" />
      </button>
      <Link
        to="/app"
        className="flex min-w-0 items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <img src="/icon.png" alt="" className="size-6 rounded-md" />
        <span className="text-[15px] font-semibold tracking-tight">SaveIt</span>
      </Link>
      <div className="flex-1" />
      <button
        type="button"
        aria-label="Search"
        onClick={() => palette.open()}
        className={iconButton}
      >
        <Search className="size-[18px]" />
      </button>
      <button
        type="button"
        aria-label="Add bookmark"
        onClick={() => palette.open({ mode: "add" })}
        className="ml-0.5 flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Plus className="size-[18px]" />
      </button>
    </div>
  );
}
