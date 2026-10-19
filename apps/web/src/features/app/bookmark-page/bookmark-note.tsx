"use client";

import { useDebounceFn } from "@/hooks/use-debounce-fn";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Card } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { Typography } from "@workspace/ui/components/typography";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

export type BookmarkNoteProps = {
  note: string | null | undefined;
  bookmarkId: string;
  variant?: "card" | "plain";
};

export const BookmarkNote = ({
  note,
  bookmarkId,
  variant = "card",
}: BookmarkNoteProps) => {
  const updateBookmark = useMutation(api.bookmarks.mutations.update);
  const [isSaving, setIsSaving] = useState(false);

  const updateNote = (noteValue: string) => {
    setIsSaving(true);
    void updateBookmark({
        id: bookmarkId as Id<"bookmarks">,
        patch: { note: noteValue },
      })
      .catch(() => {
        toast.error("Failed to save note");
      })
      .finally(() => setIsSaving(false));
  };

  const onUpdate = useDebounceFn((noteValue: string) => updateNote(noteValue));

  if (variant === "plain") {
    return (
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={`bookmark-note-${bookmarkId}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Note
          </label>
          <span
            aria-live="polite"
            className="text-xs text-muted-foreground tabular-nums"
          >
            {isSaving ? "Saving…" : null}
          </span>
        </div>
        <Textarea
          id={`bookmark-note-${bookmarkId}`}
          onChange={(e) => onUpdate(e.target.value)}
          defaultValue={note ?? ""}
          placeholder="Why did you save this? Jot it down…"
          className="min-h-24 resize-none rounded-xl border-transparent bg-muted/50 px-3.5 py-3 text-[15px] leading-relaxed shadow-none placeholder:text-muted-foreground/70 hover:bg-muted/70 focus-visible:border-ring focus-visible:bg-background dark:bg-muted/40"
        />
      </section>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <NotebookPen className="text-primary size-4" />
        <Typography variant="muted">Personal Notes</Typography>
        {isSaving && (
          <Typography variant="muted" className="text-xs">
            Saving...
          </Typography>
        )}
      </div>
      <div className="space-y-2">
        <Textarea
          onChange={(e) => onUpdate(e.target.value)}
          defaultValue={note ?? ""}
          placeholder="Add your personal notes about this bookmark..."
          className="min-h-24 resize-none"
        />
      </div>
    </Card>
  );
};
