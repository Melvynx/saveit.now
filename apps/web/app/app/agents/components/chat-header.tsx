"use client";

import { ModeToggle } from "@/features/dark-mode/mode-toggle";
import { HeaderUser } from "@/features/page/header-user";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { Link as RouterLink } from "react-router";
import { ConversationHistory } from "./conversation-history";

type ChatHeaderProps = {
  conversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
};

export function ChatHeader({
  conversationId,
  onNewConversation,
  onSelectConversation,
}: ChatHeaderProps) {
  return (
    <div className="bg-background flex items-center justify-center border-b">
      <div className="flex w-full max-w-3xl items-center gap-2 px-4 py-2">
        <RouterLink to="/app" className="flex items-center gap-2">
          <ArrowLeftIcon className="size-4" />
          <span className="text-sm font-medium">Bookmarks</span>
        </RouterLink>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={onNewConversation}
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
          <ConversationHistory
            currentConversationId={conversationId}
            onSelect={onSelectConversation}
          />
        </div>

        <ModeToggle />
        <HeaderUser />
      </div>
    </div>
  );
}
