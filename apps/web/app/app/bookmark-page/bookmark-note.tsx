"use client";

import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

export type BookmarkNoteProps = {
  note: string | null;
  bookmarkId: string;
};

export const BookmarkNote = (props: BookmarkNoteProps) => {
  return (
    <div className="space-y-2">
      <Label>Note</Label>
      <Textarea />
    </div>
  );
};
