import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { AlertTriangle, ChevronDown, House, RotateCcw } from "lucide-react";
import { useState } from "react";

export function DefaultError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-full">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          An unexpected error occurred. Try again, or head back home if the
          problem persists.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={() => router.invalidate()}>
            <RotateCcw />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">
              <House />
              Go home
            </Link>
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-muted-foreground hover:text-foreground mt-8 inline-flex items-center gap-1 text-xs transition-colors"
        >
          <ChevronDown
            className={cn("size-3 transition-transform", {
              "rotate-180": showDetails,
            })}
          />
          {showDetails ? "Hide error details" : "Show error details"}
        </button>
        {showDetails && (
          <pre className="bg-muted text-muted-foreground mt-3 max-h-48 w-full overflow-auto rounded-lg p-4 text-left font-mono text-xs whitespace-pre-wrap">
            {message}
          </pre>
        )}
      </div>
    </div>
  );
}
