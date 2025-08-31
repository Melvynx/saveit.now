"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { BookmarkTagSelector } from "./bookmark-tag-selector";

interface BookmarkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmark: {
    id: string;
    title: string | null;
  };
}

export function BookmarkTagDialog({
  open,
  onOpenChange,
  bookmark,
}: BookmarkTagDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            {bookmark.title || "Untitled bookmark"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <BookmarkTagSelector
            bookmarkId={bookmark.id}
            placeholder="Search or create tags..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
