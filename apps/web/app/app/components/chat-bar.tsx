"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CornerDownLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export function ChatBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!query.trim()) return;
    const encodedQuery = encodeURIComponent(query.trim());
    navigate(`/app/agents?q=${encodedQuery}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4">
      <div
        className={cn(
          "bg-card/95 backdrop-blur-md rounded-2xl",
          "border-2 border-primary",
          "shadow-[0_0_30px_rgba(var(--primary-rgb,59,130,246),0.3)]",
          "flex items-center gap-2 p-2",
        )}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI about your bookmarks..."
          className={cn(
            "flex-1 bg-transparent border-none outline-none",
            "text-foreground placeholder:text-muted-foreground",
            "h-10 pl-3 text-sm",
          )}
        />
        <Button
          onClick={handleSubmit}
          disabled={!query.trim()}
          size="sm"
          className="rounded-xl px-4"
        >
          <span className="hidden sm:inline mr-2">Search</span>
          <CornerDownLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
