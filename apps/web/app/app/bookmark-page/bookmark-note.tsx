"use client";

import { useDebounceFn } from "@/hooks/use-debounce-fn";
import { Card } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { Typography } from "@workspace/ui/components/typography";
import { NotebookPen } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateBookmarkNoteAction } from "../bookmarks.action";

export type BookmarkNoteProps = {
  note: string | null | undefined;
  bookmarkId: string;
};

export const BookmarkNote = ({ note, bookmarkId }: BookmarkNoteProps) => {
  const updateNoteAction = useAction(updateBookmarkNoteAction, {
    onSuccess: () => {},
    onError: () => {
      toast.error("Failed to save note");
    },
  });
  const onUpdate = useDebounceFn((note: string) =>
    updateNoteAction.execute({
      bookmarkId,
      note,
    }),
  );

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <NotebookPen className="text-primary size-4" />
        <Typography variant="muted">Personal Notes</Typography>
        {updateNoteAction.isExecuting && (
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
