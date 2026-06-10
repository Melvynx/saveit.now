"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { HistoryIcon, Loader2Icon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

dayjs.extend(relativeTime);

type ConversationItem = {
  _id: string;
  title: string | null;
  updatedAt: number;
  createdAt: number;
  likes: number;
};

type ConversationHistoryProps = {
  currentConversationId: string | null;
  onSelect: (id: string) => void;
};

export function ConversationHistory({
  currentConversationId,
  onSelect,
}: ConversationHistoryProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Convex reactive query — only active when the popover is open
  const data = useQuery(
    api.chat.queries.listConversations,
    open ? {} : "skip",
  );

  // Convex mutation for deleting a conversation
  const deleteConversation = useMutation(api.chat.mutations.deleteConversation);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsDeleting(true);
    void deleteConversation({ conversationId: id as Id<"chatConversations"> })
      .then(() => toast.success("Conversation deleted"))
      .catch(() => toast.error("Failed to delete conversation"))
      .finally(() => setIsDeleting(false));
  };

  const groupConversations = (conversations: ConversationItem[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: { label: string; items: ConversationItem[] }[] = [
      { label: "Today", items: [] },
      { label: "This week", items: [] },
      { label: "Older", items: [] },
    ];

    for (const conv of conversations) {
      const date = new Date(conv.updatedAt);
      if (date >= today) {
        groups[0]?.items.push(conv);
      } else if (date >= weekAgo) {
        groups[1]?.items.push(conv);
      } else {
        groups[2]?.items.push(conv);
      }
    }

    return groups.filter((g) => g.items.length > 0);
  };

  const conversations = data ?? [];
  const groups = groupConversations(conversations);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <HistoryIcon className="size-4" />
          <span className="hidden sm:inline">History</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2">
          <h3 className="text-sm font-medium">Conversation History</h3>
        </div>
        <ScrollArea className="h-[300px]">
          {data === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <div className="p-2">
              {groups.map((group) => (
                <div key={group.label} className="mb-3 last:mb-0">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </div>
                  {group.items.map((conv) => (
                    <button
                      key={conv._id}
                      onClick={() => handleSelect(conv._id)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50",
                        currentConversationId === conv._id && "bg-muted",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {conv.title || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayjs(conv.updatedAt).fromNow()}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDelete(e, conv._id)}
                        disabled={isDeleting}
                      >
                        <TrashIcon className="size-3" />
                      </Button>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
