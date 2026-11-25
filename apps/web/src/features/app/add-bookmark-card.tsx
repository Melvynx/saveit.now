import { LoadingButton } from "@/features/form/loading-button";
import { useNavigate } from "@tanstack/react-router";
import { Link2 } from "lucide-react";
import { getDomain } from "./bookmark-card/bookmark-card-parts";
import { useSavedBookmarkTray } from "./library/saved-bookmark-store";
import { useCreateBookmarkAction } from "./use-create-bookmark";

/** Shown instead of results when the search field holds a URL. */
export function AddBookmarkCard({ url }: { url: string }) {
  const navigate = useNavigate();
  const announce = useSavedBookmarkTray((state) => state.announce);
  const action = useCreateBookmarkAction({
    onSuccess: (created) => {
      announce(created);
      void navigate({
        to: "/app",
        search: (previous) => ({ ...previous, query: undefined }) as never,
      });
    },
  });

  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-card py-3 pr-3 pl-3.5 ring-1 ring-foreground/8">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Link2 className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">
          Save {getDomain(url)}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">{url}</p>
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
