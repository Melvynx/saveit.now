"use client";

import { useDebounceFn } from "@/hooks/use-debounce-fn";
import { upfetch } from "@/lib/up-fetch";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { Typography } from "@workspace/ui/components/typography";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";

export type BookmarkNoteProps = {
  note: string | null | undefined;
  bookmarkId: string;
};

export const BookmarkNote = ({ note, bookmarkId }: BookmarkNoteProps) => {
  const updateNoteAction = useMutation({
    mutationFn: (note: string) =>
      upfetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PATCH",
        body: { note },
      }),
    onSuccess: () => {},
    onError: () => {
      toast.error("Failed to save note");
    },
  });
  const onUpdate = useDebounceFn((note: string) =>
    updateNoteAction.mutate(note),
  );

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <NotebookPen className="text-primary size-4" />
        <Typography variant="muted">Personal Notes</Typography>
        {updateNoteAction.isPending && (
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
