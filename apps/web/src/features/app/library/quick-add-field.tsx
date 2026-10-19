import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { Loader } from "@workspace/ui/components/loader";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatShortcutKey } from "../shell/shortcuts";
import { normalizeBookmarkUrl } from "../schema";
import { useCreateBookmarkAction } from "../use-create-bookmark";

type QuickAddFieldProps = {
  className?: string;
  size?: "default" | "lg";
  autoFocus?: boolean;
};

/** Inline "Paste a link to save it…" field at the top of the library. */
export function QuickAddField({
  className,
  size = "default",
  autoFocus,
}: QuickAddFieldProps) {
  const [url, setUrl] = useState("");
  const action = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Saved to your library");
      setUrl("");
    },
  });
  const normalizedUrl = normalizeBookmarkUrl(url);

  const submit = () => {
    if (action.isPending) return;
    if (!normalizedUrl) {
      if (url.trim()) toast.error("That doesn't look like a link, try example.com");
      return;
    }
    void action.execute({ url: normalizedUrl });
  };

  return (
    <form
      className={cn(
        "group/quick-add relative flex w-full items-center gap-2.5 rounded-xl bg-card px-3.5 ring-1 ring-foreground/7 transition-[box-shadow] duration-150 focus-within:ring-2 focus-within:ring-primary/60",
        size === "lg" ? "h-13" : "h-11",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Link2
        className="size-4 shrink-0 text-muted-foreground transition-colors group-focus-within/quick-add:text-primary"
        aria-hidden
      />
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Paste a link to save it…"
        aria-label="Paste a link to save it"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        data-testid="quick-add-input"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
          size === "lg" ? "text-[15px]" : "text-[14px]",
        )}
      />
      {action.isPending ? (
        <Loader className="size-4 text-muted-foreground" />
      ) : normalizedUrl ? (
        <button
          type="submit"
          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Save
          <ArrowRight className="size-3" aria-hidden />
        </button>
      ) : (
        <span className="hidden items-center gap-1.5 text-[12px] text-muted-foreground sm:flex">
          or paste anywhere
          <KbdGroup>
            <Kbd>{formatShortcutKey("mod")}</Kbd>
            <Kbd>V</Kbd>
          </KbdGroup>
        </span>
      )}
    </form>
  );
}
