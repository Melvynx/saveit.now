import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { BookmarkX, House } from "lucide-react";

export function DefaultNotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-medium"
            aria-label="SaveIt.now home"
          >
            <span className="bg-muted/50 rounded-md border px-2 py-1 text-sm">
              SaveIt<span className="text-primary font-bold">.now</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
          <div className="max-w-lg">
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
              <BookmarkX className="size-6" aria-hidden="true" />
            </div>

            <p className="text-primary mt-6 text-sm font-medium">Error 404</p>
            <h1 className="mt-2 text-balance text-3xl font-semibold sm:text-4xl">
              We couldn&apos;t find this page.
            </h1>
            <p className="text-muted-foreground mt-3 max-w-md text-pretty text-base leading-7">
              The link may be incomplete, expired, or pointing somewhere that
              no longer exists.
            </p>

            <Button asChild size="lg" className="mt-7">
              <Link to="/">
                <House aria-hidden="true" />
                Back to SaveIt.now
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="text-muted-foreground border-t py-5 text-center text-xs">
        Save what matters. Find it when you need it.
      </footer>
    </div>
  );
}
