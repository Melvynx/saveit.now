import { LoadingButton } from "@/features/form/loading-button";
import { useNavigate } from "@tanstack/react-router";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { getDomain } from "./bookmark-card/bookmark-card-parts";
import { useCreateBookmarkAction } from "./use-create-bookmark";

/** Shown instead of results when the search field holds a URL. */
export function AddBookmarkCard({ url }: { url: string }) {
  const navigate = useNavigate();
  const action = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Saved to your library");
      void navigate({
        to: "/app",
        search: (previous) => ({ ...previous, query: undefined }) as never,
      });
    },
  });

  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/7 animate-rise-in">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Link2 className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-foreground">
          Save {getDomain(url)} to your library?
        </p>
        <p className="truncate font-mono text-[12px] text-muted-foreground">
          {url}
        </p>
      </div>
      <LoadingButton
        size="sm"
        className="shrink-0"
        loading={action.isPending}
        onClick={() => void action.execute({ url })}
      >
        Save link
      </LoadingButton>
    </div>
  );
}
