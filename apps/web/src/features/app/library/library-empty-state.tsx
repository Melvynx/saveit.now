import { APP_LINKS } from "@/lib/app-links";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Import, Puzzle, SearchX } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { QuickAddField } from "./quick-add-field";

/** 0 bookmarks: serif headline, paste field, Import + Extension CTAs. */
export function LibraryFirstRunState() {
  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col items-center px-2 pt-12 pb-16 text-center animate-rise-in md:pt-20"
      data-testid="library-first-run"
    >
      <p className="mb-4 text-[12px] font-medium tracking-wide text-primary">
        Welcome to SaveIt
      </p>
      <h2 className="font-serif text-[32px] leading-[1.1] font-medium tracking-[-0.02em] text-balance text-foreground md:text-[40px]">
        Your library starts with a single link
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-pretty text-muted-foreground">
        Paste anything worth keeping. SaveIt reads it, summarizes it and tags
        it, so you can find it again in a second.
      </p>
      <QuickAddField size="lg" className="mt-8 text-left" autoFocus />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          to={APP_LINKS.imports}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Import className="size-3.5" aria-hidden />
          Import bookmarks
        </Link>
        <Link
          to={APP_LINKS.extensions}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Puzzle className="size-3.5" aria-hidden />
          Get the extension
        </Link>
      </div>
    </div>
  );
}

export function LibrarySearchErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-64 w-full flex-col items-center justify-center gap-2 px-6 py-12 text-center"
    >
      <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-4" aria-hidden />
      </span>
      <p className="font-serif text-[20px] font-medium text-foreground">
        Search didn&apos;t go through
      </p>
      <p className="text-[13px] text-muted-foreground">
        Something went wrong while searching your bookmarks.
      </p>
      <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
