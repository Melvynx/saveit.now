import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { getQuickSaveTargetUrl } from "@/lib/quick-save-url";
import { api } from "@convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Loader } from "@workspace/ui/components/loader";
import {
  ClientOnly,
  createFileRoute,
  notFound,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/$")({
  loader: ({ params, location }) => {
    const targetUrl = getQuickSaveTargetUrl({
      splat: params._splat ?? "",
      searchStr: location.searchStr,
      hash: location.hash,
    });

    if (!targetUrl) {
      throw notFound();
    }

    return { targetUrl };
  },
  component: QuickSaveRoute,
});

function QuickSaveRoute() {
  return (
    <ClientOnly fallback={<QuickSaveStatus label="Preparing your bookmark…" />}>
      <QuickSaveBookmark />
    </ClientOnly>
  );
}

function QuickSaveBookmark() {
  const { targetUrl } = Route.useLoaderData();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const quickSave = useMutation(api.bookmarks.mutations.quickSave);
  const hasStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isLoading || hasStarted.current) {
      return;
    }

    if (!isAuthenticated) {
      hasStarted.current = true;
      const redirectUrl = `${location.pathname}${location.searchStr}${location.hash}`;
      void navigate({
        to: "/signin",
        search: { redirectUrl },
        replace: true,
      });
      return;
    }

    hasStarted.current = true;
    setError(null);

    void quickSave({ url: targetUrl })
      .then(() => {
        trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_CREATED);
        toast.success("Bookmark saved");
        void navigate({ to: "/app", replace: true });
      })
      .catch((caughtError: unknown) => {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to save bookmark";

        if (message.includes("already exists")) {
          toast.info("Bookmark already exists");
          void navigate({ to: "/app", replace: true });
          return;
        }

        setError(message);
      });
  }, [
    attempt,
    isAuthenticated,
    isLoading,
    location.hash,
    location.pathname,
    location.searchStr,
    navigate,
    quickSave,
    targetUrl,
  ]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-md space-y-5 text-center">
          <img
            src="/icon.png"
            alt=""
            className="mx-auto size-12 rounded-xl object-cover"
          />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">
              Couldn’t save this bookmark
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">{error}</p>
          </div>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => {
                hasStarted.current = false;
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </Button>
            <Button variant="outline" asChild>
              <a href="/app">Go to bookmarks</a>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return <QuickSaveStatus label="Saving your bookmark…" />;
}

function QuickSaveStatus({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="space-y-4 text-center">
        <img
          src="/icon.png"
          alt=""
          className="mx-auto size-12 rounded-xl object-cover"
        />
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader className="size-4" />
          <span>{label}</span>
        </div>
      </div>
    </main>
  );
}
