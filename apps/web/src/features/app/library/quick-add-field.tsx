import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { Loader } from "@workspace/ui/components/loader";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowUp, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { formatShortcutKey } from "../shell/shortcuts";
import { normalizeBookmarkUrl } from "../schema";
import { useCreateBookmarkAction } from "../use-create-bookmark";
import { FADE_FAST, SPRING_SNAPPY } from "./motion";
import { useSavedBookmarkTray } from "./saved-bookmark-store";

type QuickAddFieldProps = {
  className?: string;
  size?: "default" | "lg";
  autoFocus?: boolean;
};

/**
 * Inline "Paste a link to save it…" field at the top of the library. Filled
 * and borderless at rest so it reads as secondary to the search field; the
 * save button only exists once there is a link to save.
 */
export function QuickAddField({
  className,
  size = "default",
  autoFocus,
}: QuickAddFieldProps) {
  const [url, setUrl] = useState("");
  const reduceMotion = useReducedMotion();
  const announce = useSavedBookmarkTray((state) => state.announce);
  const action = useCreateBookmarkAction({
    onSuccess: (created) => {
      announce(created);
      setUrl("");
    },
  });
  const normalizedUrl = normalizeBookmarkUrl(url);
  const trailing = action.isPending ? "pending" : normalizedUrl ? "save" : "hint";

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
        "group/quick-add relative flex w-full items-center gap-2.5 rounded-xl bg-muted/60 pr-1.5 pl-3.5 ring-1 ring-transparent transition-[background-color,box-shadow] duration-200 ease-(--ease-out-soft) hover:bg-muted focus-within:bg-card focus-within:ring-2 focus-within:ring-ring hover:focus-within:bg-card",
        size === "lg" ? "h-13" : "h-10",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Plus
        className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-focus-within/quick-add:text-foreground"
        aria-hidden
      />
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Paste a link to save it…"
        aria-label="Paste a link to save it"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus={autoFocus}
        enterKeyHint="go"
        data-testid="quick-add-input"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
          size === "lg" ? "text-[15px]" : "text-[14px]",
        )}
      />
      <div className="flex h-7 shrink-0 items-center justify-end">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={trailing}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: FADE_FAST }
                : { opacity: 0, scale: 0.8, transition: FADE_FAST }
            }
            transition={SPRING_SNAPPY}
            className="flex items-center"
          >
            {trailing === "pending" ? (
              <span className="flex size-7 items-center justify-center">
                <Loader className="size-4 text-muted-foreground" />
              </span>
            ) : trailing === "save" ? (
              <button
                type="submit"
                aria-label="Save link"
                className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[scale,opacity] duration-150 ease-(--ease-out-soft) outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-90"
              >
                <ArrowUp className="size-4 stroke-[2.5]" aria-hidden />
              </button>
            ) : (
              <span className="hidden items-center gap-1.5 pr-2 text-[12px] text-muted-foreground sm:flex">
                or paste anywhere
                <KbdGroup>
                  <Kbd>{formatShortcutKey("mod")}</Kbd>
                  <Kbd>V</Kbd>
                </KbdGroup>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </form>
  );
}
