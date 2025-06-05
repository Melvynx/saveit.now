"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { Card } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Typography } from "@workspace/ui/components/typography";
import { NotebookPen } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateBookmarkNoteAction } from "../bookmarks.action";
import { useQueryClient } from "@tanstack/react-query";

export type BookmarkNoteProps = {
  note: string | null | undefined;
  bookmarkId: string;
};

export const BookmarkNote = ({ note, bookmarkId }: BookmarkNoteProps) => {
  const [localNote, setLocalNote] = useState(note || "");
  const debouncedNote = useDebounce(localNote, 1000);
  const queryClient = useQueryClient();
  
  const updateNoteAction = useAction(updateBookmarkNoteAction, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["bookmark", bookmarkId],
      });
    },
    onError: () => {
      toast.error("Failed to save note");
    },
  });

  useEffect(() => {
    if (debouncedNote !== (note || "")) {
      updateNoteAction.execute({
        bookmarkId,
        note: debouncedNote || null,
      });
    }
  }, [debouncedNote, bookmarkId, note, updateNoteAction]);

  const handleNoteChange = (value: string) => {
    setLocalNote(value);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
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
          value={localNote}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Add your personal notes about this bookmark..."
          className="min-h-24 resize-none"
        />
      </div>
    </Card>
  );
};
